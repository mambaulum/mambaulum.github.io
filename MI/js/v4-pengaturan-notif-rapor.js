// ============================================================
// v4-pengaturan-notif-rapor.js -- TARIF HONOR, PENGATURAN ABSEN QR, NOTIFIKASI, PERSETUJUAN, RAPOR V4 (dipecah dari app.js, tahap 5)
// ============================================================
// Isi: form tarif honor V4 (v4RenderHonorConfig/v4SaveHonorRates), pengaturan Absen QR (token, lokasi, cetak QR),
// notifikasi V4, persetujuan (v4LoadApprovals/v4ProcessApproval), v4RefreshTasks, dan Rapor V4
// (hitung sholat/pramuka/ekskul siswa, pratinjau, finalisasi, cetak).
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: v4HitungJarakMeter() (dipakai verifikasi lokasi Absen QR guru), pemuat inti V4.
// ============================================================

    // -------- Guru Pengganti (jadwal mengajar): DIHAPUS --------
    // Sistem request/offer/accept/eskalasi V4 (substitution_requests_v4,
    // substitution_daily_claims_v4) dihapus karena duplikat & tidak sinkron dengan
    // validasi "mewakili" yang sudah berjalan di Jurnal Mengajar (lihat
    // lookupJadwalUntukJurnal, terapkanJadwalPilihan, checkBentrokJurnal, dan
    // VALIDASI B/C/E di dalam simpanJurnal): guru diwakili wajib punya jadwal di
    // kelas+jam itu, dibatasi MAX_MEWAKILI_PER_HARI per hari, dan dicek bentrok jam.
    // Jalur jurnal itu sekarang SATU-SATUNYA cara mencatat "mewakili guru lain",
    // dan tetap dihonor lewat rate V4.rates.substitute (lihat v4GetHonorRates()/v4HitungHonor())
    // yang diatur di halaman Honor > Tarif Honor Terpusat.
    // (Fitur "Pengganti PIC Kegiatan" -- v4ToggleAppointSubstitute /
    // v4RemoveActivitySubstitute, state V4.activitySubstitutes -- TIDAK ikut dihapus,
    // itu fitur berbeda untuk kegiatan/amalan harian, bukan jadwal mengajar.)

    // -------- Honor configuration: guru asli, pengganti, kegiatan --------
    function v4RenderHonorConfig(){
      const card=document.getElementById('ekskulRateCard'); if(!card)return;
      if(v4IsAdmin()||v4IsHead()){
        let host=document.getElementById('v4HonorConfig');
        if(!host){host=document.createElement('div');host.id='v4HonorConfig';host.className='card';host.setAttribute('data-menutab','ekskul');const tabAktif=document.querySelector('#honorMenuTabs .honor-tab-btn.aktif');host.style.display=(tabAktif&&tabAktif.getAttribute('data-menutab')!=='ekskul')?'none':'';card.parentElement.insertBefore(host,card);}
        host.innerHTML=`<div class="v4-section-title"><h3>⚙️ Tarif Honor Terpusat</h3><span class="v4-chip blue">Admin</span></div><div class="v4-grid-3"><div><label class="label">Honor Guru Asli / sesi</label><input id="v4RateOriginal" type="number" class="field" value="${V4.rates.original||V4_TARIF_DEFAULT.original}"></div><div><label class="label">Honor Guru Pengganti / sesi</label><input id="v4RateSubstitute" type="number" class="field" value="${V4.rates.substitute||V4_TARIF_DEFAULT.substitute}"></div><div><label class="label">Honor Kegiatan / sesi (Lembur-Rapat &amp; Ujian)</label><input id="v4RateActivity" type="number" class="field" value="${V4.rates.activity||0}"></div><div><label class="label">Honor Sholat Dhuha / hadir</label><input id="v4RateDluha" type="number" class="field" value="${V4.rates.dluha||V4_TARIF_DEFAULT.dluha}"></div><div><label class="label">Honor Sholat Dzuhur / hadir</label><input id="v4RateDzuhur" type="number" class="field" value="${V4.rates.dzuhur||V4_TARIF_DEFAULT.dzuhur}"></div><div><label class="label">Honor Tetap Kepala Madrasah / bulan</label><input id="v4RateKepsek" type="number" min="0" class="field" value="${V4.rates.kepsek ?? V4_TARIF_DEFAULT.kepsek}"></div><div><label class="label">Honor Tetap Ketua Yayasan / bulan</label><input id="v4RateYayasan" type="number" min="0" class="field" value="${V4.rates.yayasan ?? V4_TARIF_DEFAULT.yayasan}"></div><div><label class="label">Rate Ekskul default / jam</label><input id="v4RateEkstra" type="number" min="1" step="1000" class="field" value="${V4.rates.ekstra||V4_TARIF_DEFAULT.ekstra}"></div></div><p class="v4-muted" style="margin-top:8px;">Honor Guru Asli &amp; Guru Pengganti langsung berlaku ke semua perhitungan honor. Honor Kegiatan hanya jadi <strong>nilai default</strong> yang otomatis terisi saat Admin membuat acara Lembur/Rapat atau Ujian baru di menu masing-masing -- tetap bisa diubah manual per acara, dan tidak mengubah honor acara yang sudah dibuat sebelumnya. Honor Sholat Dhuha &amp; Dzuhur langsung berlaku ke semua perhitungan honor bulan berjalan (dihitung per kehadiran "Hadir" guru pada absen religi). Honor Tetap Kepala Madrasah &amp; Ketua Yayasan adalah nominal bulanan di dua baris paling atas rekap Honor (tabel, PDF, dan laporan); isi 0 bila tidak ada honor tetap. Rate Ekskul default dipakai untuk kegiatan ekstrakurikuler yang belum diatur ratenya di kartu Rate Ekstrakurikuler; kegiatan yang sudah punya rate sendiri tidak berubah. Perubahan berlaku untuk perhitungan semua bulan yang dibuka sesudahnya.</p><button class="btn btn-success" style="margin-top:9px;" onclick="v4SaveHonorRates()">💾 Simpan Tarif</button>`;
      }
    }
    // Validasi tarif: kosong / bukan angka / negatif SELALU ditolak; nilai 0 ditolak untuk tarif yang
    // dipakai v4GetHonorRates() (original, substitute, dluha, dzuhur) karena pembacanya memakai
    // `|| 7000/5000` -- nilai 0 yang tersimpan akan DIAM-DIAM dibaca sebagai tarif default, sementara
    // toast tetap bilang "diperbarui". Hanya `activity` (default prefill acara) yang boleh 0.
    function v4SaveHonorRates(){
      if(!v4CanAdmin())return toast('Hanya Admin!',true);
      const defs=[
        ['original','v4RateOriginal','Honor Guru Asli',false,null],
        ['substitute','v4RateSubstitute','Honor Guru Pengganti',false,null],
        ['activity','v4RateActivity','Honor Kegiatan',true,null],
        ['dluha','v4RateDluha','Honor Sholat Dhuha',false,V4_TARIF_DEFAULT.dluha],
        ['dzuhur','v4RateDzuhur','Honor Sholat Dzuhur',false,V4_TARIF_DEFAULT.dzuhur],
        ['kepsek','v4RateKepsek','Honor Tetap Kepala Madrasah',true,V4_TARIF_DEFAULT.kepsek],
        ['yayasan','v4RateYayasan','Honor Tetap Ketua Yayasan',true,V4_TARIF_DEFAULT.yayasan],
        ['ekstra','v4RateEkstra','Rate Ekskul default',false,V4_TARIF_DEFAULT.ekstra]
      ];
      const rates={};
      for(const [k,id,label,bolehNol,fallback] of defs){
        const el=document.getElementById(id);
        if(!el&&fallback!==null){rates[k]=(V4.rates&&V4.rates[k])||fallback;continue;} // input tak ada di DOM: pertahankan nilai lama
        const raw=String(el.value).trim(),n=Number(raw);
        if(raw===''||!isFinite(n)||n<0||(!bolehNol&&n===0)){
          toast(`⚠️ ${label} harus berupa angka ${bolehNol?'0 atau lebih':'lebih dari 0'}.`,true);
          el.focus();
          return;
        }
        rates[k]=n;
      }
      rates.updatedBy=currentUser.name;rates.updatedAt=new Date().toISOString();
      adminSesi().then(()=>db.ref('honor_rates_v4').set(rates)).then(()=>{V4.rates=rates;v4Audit('UPDATE_HONOR_RATES','HONOR_RATE','global',null,rates);toast('✅ Tarif honor diperbarui');}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ ' + honorPesanGagalTulis(err, 'Gagal menyimpan tarif'), true, 7000); });
    }

    // ============================================================
    // ABSEN GURU VIA QR + LOKASI (tanpa foto)
    // ============================================================
    function v4GenerateAbsenQrToken(){
      return 'SIMAMBA-ABSEN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,10).toUpperCase();
    }
    function v4LoadAbsenQrSettings(){
      return db.ref('absen_qr_settings').once('value').then(s => { V4.absenQr = s.val() || null; v4CacheAbsenQr(V4.absenQr); });
    }
    function v4RenderAbsenQrSettingsForm(){
      if(!isAdmin()) return;
      const q = V4.absenQr;
      document.getElementById('absenQrLat').value = q && q.lat != null ? q.lat : '';
      document.getElementById('absenQrLng').value = q && q.lng != null ? q.lng : '';
      document.getElementById('absenQrRadius').value = q && q.radius != null ? q.radius : 150;
      const info = document.getElementById('absenQrTokenInfo');
      if (q && q.token) info.textContent = `Token QR aktif: ...${q.token.slice(-8)} (dibuat ${q.updatedBy || '-'}, ${q.updatedAt ? new Date(q.updatedAt).toLocaleString('id-ID') : '-'})`;
      else info.textContent = 'Token QR: belum dibuat. Klik "Buat Token QR Baru" lalu "Simpan Lokasi & QR".';
    }
    function v4GunakanLokasiSaya(){
      if (!navigator.geolocation) return toast('⚠️ Perangkat tidak mendukung GPS.', true);
      toast('📍 Mengambil lokasi Anda...', false, 2000);
      navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('absenQrLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('absenQrLng').value = pos.coords.longitude.toFixed(6);
        toast('✅ Lokasi saat ini terisi. Pastikan Anda sedang berada di madrasah sebelum menyimpan.');
      }, err => {
        toast('❌ Gagal ambil lokasi: ' + err.message, true);
      }, { enableHighAccuracy: true, timeout: 10000 });
    }
    function v4RegenerateAbsenQrToken(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('QR lama yang sudah dicetak/ditempel akan langsung tidak berlaku lagi. Lanjutkan buat token baru?')) return;
      V4.absenQr = V4.absenQr || {};
      V4.absenQr.token = v4GenerateAbsenQrToken();
      v4RenderAbsenQrSettingsForm();
      toast('🔄 Token baru dibuat. Klik "Simpan Lokasi & QR" untuk menerapkan, lalu cetak QR yang baru.');
    }
    function v4SaveAbsenQrSettings(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const lat = parseFloat(document.getElementById('absenQrLat').value);
      const lng = parseFloat(document.getElementById('absenQrLng').value);
      const radius = parseInt(document.getElementById('absenQrRadius').value) || 150;
      if (isNaN(lat) || isNaN(lng)) return toast('⚠️ Isi Latitude & Longitude dulu (atau klik "Pakai Lokasi Saya Sekarang").', true);
      const token = (V4.absenQr && V4.absenQr.token) || v4GenerateAbsenQrToken();
      const data = { lat, lng, radius, token, updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
      db.ref('absen_qr_settings').set(data, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        V4.absenQr = data; v4CacheAbsenQr(data);
        v4RenderAbsenQrSettingsForm();
        v4Audit('UPDATE_ABSEN_QR_SETTINGS','ABSEN_QR','global',null,data);
        toast('✅ Lokasi & QR Absensi disimpan!');
      });
    }
    function v4CetakQrAbsensi(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const token = V4.absenQr && V4.absenQr.token;
      if (!token) return toast('⚠️ Token QR belum dibuat. Klik "Buat Token QR Baru" lalu "Simpan Lokasi & QR" dulu.', true);
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(tmp);
      try { new QRCode(tmp, { text: token, width: 300, height: 300, correctLevel: QRCode.CorrectLevel.H }); }
      catch (e) { document.body.removeChild(tmp); return toast('❌ Gagal membuat QR: ' + e.message, true); }
      setTimeout(() => {
        const canvasEl = tmp.querySelector('canvas'), imgEl = tmp.querySelector('img');
        const dataUrl = canvasEl ? canvasEl.toDataURL('image/png') : (imgEl ? imgEl.src : '');
        document.body.removeChild(tmp);
        if (!dataUrl) return toast('❌ Gagal membuat gambar QR.', true);
        const w = window.open('', '_blank', 'width=700,height=900');
        if (!w) return toast('Popup diblokir browser.', true);
        w.document.write(`<html><head><title>QR Absensi Guru - SI MAMBA</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#111}img{width:320px;height:320px;border:1px solid #ddd;padding:12px;border-radius:12px;}h1{font-size:22px;margin-bottom:4px;}p{color:#444;}@media print{button,.no-print{display:none}}</style></head><body><h1>📍 QR Absensi Guru</h1><p>MI Mambaul Ulum — tempel di lokasi madrasah</p><img src="${dataUrl}"><p style="margin-top:20px;font-size:13px;color:#666;max-width:360px;margin-left:auto;margin-right:auto;">Scan QR ini lewat menu <b>Absen Guru</b> di aplikasi SI MAMBA. Lokasi GPS akan diverifikasi otomatis saat scan — pastikan absen dilakukan di lokasi ini.</p><button onclick="window.print()" style="margin-top:20px;padding:10px 24px;font-size:14px;">🖨️ Cetak</button></body></html>`);
        w.document.close();
      }, 150);
    }

    // -------- Notifications / tasks / approval --------
    function v4LoadNotifications(){
      if(!currentUser)return Promise.resolve();
      const seq=++v4NotifSeq;
      const penuh=v4IsAdmin()||v4IsHead();
      // Admin/Kepsek melihat semua notifikasi (baca node penuh). Pengguna lain hanya mengunduh miliknya + 'system'
      // lewat query per userKey (hemat kuota Spark; makin hemat bila Rules punya ".indexOn": ["userKey"] di notifications_v4).
      const ref=db.ref('notifications_v4');
      const tarik=penuh
        ? ref.once('value').then(s=>{const a=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;a.push(x)});return a})
        : Promise.all([...new Set([currentUser.key,currentUser.name,'system'].filter(Boolean))].map(k=>
            ref.orderByChild('userKey').equalTo(k).once('value').then(s=>{const a=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;a.push(x)});return a})
          )).then(r=>{const m=new Map();r.flat().forEach(x=>m.set(x.key,x));return [...m.values()]});
      return fbTimeout(tarik.then(a=>{if(seq!==v4NotifSeq)return;V4.notifications=a;v4RenderNotifications();}), 7000, 'notifications_v4');
    }
    function v4RenderNotifications(){const el=document.getElementById('v4NotificationList');if(!el)return;const milikku=x=>!!currentUser&&(x.userKey===currentUser.key||x.userKey===currentUser.name);const unread=V4.notifications.filter(x=>milikku(x)&&!x.isRead).length;document.getElementById('v4NotifDot')?.classList.toggle('show',unread>0);el.innerHTML=V4.notifications.slice().sort((a,b)=>COLLATOR_ID.compare(String(b.createdAt), String(a.createdAt))).slice(0,100).map(x=>`<div class="v4-notif ${(milikku(x)&&!x.isRead)?'unread':''}" ${(milikku(x)&&!x.isRead)?`onclick="v4MarkNotifRead('${escapeJs(x.key)}')" title="Ketuk untuk menandai dibaca"`:''}><div class="v4-notif-icon">${x.type==='ACTION'?'🚨':x.type==='SUCCESS'?'✅':x.type==='ALERT'?'⚠️':x.type==='REMINDER'?'⏰':'🔔'}</div><div style="flex:1"><div style="font-weight:800;font-size:13px;">${v4Safe(x.title)}</div><div style="font-size:12px;margin-top:3px;line-height:1.45;">${v4Safe(x.message)}</div><div class="v4-muted" style="margin-top:4px;">${x.createdAt?new Date(x.createdAt).toLocaleString('id-ID'):''}</div></div></div>`).join('')||'<p class="v4-muted">Belum ada notifikasi.</p>';}
    function v4MarkNotifRead(key){if(!currentUser||!key)return;const x=V4.notifications.find(n=>n.key===key);if(!x||x.isRead)return;if(!(x.userKey===currentUser.key||x.userKey===currentUser.name))return;x.isRead=true;v4RenderNotifications();db.ref('notifications_v4').update({[key+'/isRead']:true}).then(()=>{v4NotifSeq++;}).catch(err=>{x.isRead=false;v4RenderNotifications();console.error('[SI MAMBA] Gagal simpan:',err);toast('❌ Gagal menyimpan: '+(err&&err.message||err),true);});}
    function v4MarkAllNotificationsRead(){if(!currentUser)return;const updates={};V4.notifications.filter(x=>!x.isRead && (x.userKey===currentUser.key||x.userKey===currentUser.name)).forEach(x=>updates[x.key+'/isRead']=true);if(Object.keys(updates).length)db.ref('notifications_v4').update(updates).then(()=>{v4NotifSeq++;V4.notifications.forEach(x=>x.isRead=true);v4RenderNotifications();toast('✓ Semua notifikasi dibaca');}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });}
    function v4LoadApprovals(){const seq=++v4ApprSeq;return fbTimeout(db.ref('approval_requests_v4').once('value').then(s=>{if(seq!==v4ApprSeq)return;V4.approvals=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;if(v4CanHead()||x.requestedByKey===currentUser?.key)V4.approvals.push(x)});v4RenderApprovals();}), 7000, 'approval_requests_v4');}
    // Pusat Approval: gabungan permintaan yang menunggu -- Jurnal Susulan, Pulang Duluan, Koreksi Raport.
    // Tombol memanggil fungsi approve/reject yang sama dengan halaman asalnya (satu sumber logika).
    function v4RenderApprovals(){
      const el=document.getElementById('v4ApprovalList'); if(!el||!currentUser) return;
      const head=v4CanHead(), me=currentUser;
      const milikku=o=>head||(o.guruKey?o.guruKey===me.key:o.guru===me.name);
      const jam=k=>(typeof jamSettings==='object'&&jamSettings&&jamSettings[k])||{mulai:'-',selesai:'-'};
      const items=[];
      (allJournals||[]).filter(j=>j.status==='pending'&&milikku(j)).forEach(j=>items.push({jenis:'JURNAL',key:j.key,ikon:'📓',judul:`Jurnal susulan — ${j.subject||'-'} (${j.kelas||'-'})`,meta:`${j.tanggal||'-'} · Jam ke-${j.jam_ke||'-'} (${jam(j.jam_ke).mulai}–${jam(j.jam_ke).selesai}) · 👤 ${j.guru||'-'}`,isi:j.activity||'',waktu:j.requestedAt||j.dibuat||''}));
      (allEarlyLeaveRequests||[]).filter(r=>r.status==='pending'&&milikku(r)).forEach(r=>items.push({jenis:'PULANG',key:r.key,ikon:'🚪',judul:`Pulang duluan — ${r.guru||'-'}`,meta:`${r.tanggal||'-'}`,isi:r.alasan||'',waktu:r.createdAt||''}));
      (V4.approvals||[]).filter(x=>x.status==='PENDING').forEach(x=>items.push({jenis:'RAPORT',key:x.key,ikon:'↩️',judul:x.title||'Koreksi raport',meta:`Pengaju: ${x.requestedBy||'-'}`,isi:x.reason||'',waktu:x.createdAt||''}));
      items.sort((a,b)=>COLLATOR_ID.compare(String(b.waktu), String(a.waktu)));
      const cnt=t=>items.filter(x=>x.jenis===t).length;
      const chip=document.getElementById('v4ApprovalCount'); if(chip) chip.textContent=items.length+' menunggu';
      const sum=document.getElementById('v4ApprovalSummary');
      if(sum) sum.innerHTML=`<div class="v4-card"><div class="v4-muted">Jurnal Susulan</div><div class="v4-kpi">${cnt('JURNAL')}</div></div><div class="v4-card"><div class="v4-muted">Pulang Duluan</div><div class="v4-kpi">${cnt('PULANG')}</div></div><div class="v4-card"><div class="v4-muted">Koreksi Raport</div><div class="v4-kpi">${cnt('RAPORT')}</div></div>`;
      const btn=(cls,label,fn,key)=>`<button class="btn ${cls}" style="padding:5px 9px;font-size:11px;min-height:34px;" data-key="${escapeHtml(key)}" onclick="${fn}">${label}</button>`;
      const aksi=x=>{
        if(!head) return '<span class="v4-final-badge">⏳ Menunggu</span>';
        if(x.jenis==='JURNAL') return btn('btn-success','Setujui','approveJournal(this.dataset.key)',x.key)+btn('btn-danger','Tolak','rejectJournal(this.dataset.key)',x.key);
        if(x.jenis==='PULANG') return btn('btn-success','Setujui','approveEarlyLeave(this.dataset.key)',x.key)+btn('btn-danger','Tolak','rejectEarlyLeave(this.dataset.key)',x.key);
        return btn('btn-success','Setujui',"v4ProcessApproval(this.dataset.key,'APPROVED')",x.key)+btn('btn-danger','Tolak',"v4ProcessApproval(this.dataset.key,'REJECTED')",x.key);
      };
      let html=items.length?items.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">${x.ikon} ${escapeHtml(x.judul)}</div><div class="v4-task-meta">${escapeHtml(x.meta)}</div>${x.isi?`<div class="text-strong" style="font-size:13px;margin-top:4px;white-space:pre-wrap;">${escapeHtml(x.isi)}</div>`:''}</div><div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">${aksi(x)}</div></div>`).join(''):'<div class="text-muted border-muted" style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;">✅ Tidak ada permintaan yang menunggu persetujuan.</div>';
      const riwayat=(V4.approvals||[]).filter(x=>x.status!=='PENDING').slice().reverse().slice(0,10);
      if(riwayat.length) html+=`<h4 style="font-weight:700;margin:16px 0 8px;">🕘 Riwayat Koreksi Raport (10 terakhir)</h4>`+riwayat.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">↩️ ${escapeHtml(x.title||x.type||'Koreksi raport')}</div><div class="v4-task-meta">Pengaju: ${escapeHtml(x.requestedBy||'-')} · ${x.createdAt?escapeHtml(new Date(x.createdAt).toLocaleString('id-ID')):''}${x.reason?' · '+escapeHtml(x.reason):''}</div></div><span class="v4-final-badge">${escapeHtml(x.status)}</span></div>`).join('');
      el.innerHTML=html;
    }
    function v4ProcessApproval(key,status){
      if(!v4CanHead())return toast('Tidak berwenang!',true);
      const x=V4.approvals.find(a=>a.key===key); if(!x)return;
      const reason=status==='REJECTED'?prompt('Alasan penolakan/perbaikan:')||'Tanpa catatan':'';
      const approvedAt=new Date().toISOString();
      db.ref('approval_requests_v4/'+key).update({status,approvedBy:currentUser.name,approvedAt,reason}).then(()=>{
        const statusLama=x.status;
        // Koreksi raport DISETUJUI -> buka kunci raport siswa tsb (nilai bisa diedit & raport bisa difinalisasi ulang).
        if(status==='APPROVED'&&x.type==='CORRECTION'&&x.studentId){((typeof isAdmin==='function'&&isAdmin())?adminSesiSiap():guruSesiSiap()).then(()=>db.ref('report_locks_v4/'+raporKunciKey(x.studentId,x.tahunAjaran||currentTahunAjaran,x.semester||currentSemesterAktif)).update({status:'UNLOCKED',unlockedBy:currentUser.name,unlockedAt:approvedAt,unlockRequestKey:key})).then(()=>{window._raporKunciCache=null;window._raporLockInfo=null;}).catch(e=>console.warn('[SI MAMBA] Gagal membuka kunci raport:',e));}
        // FIX: perbarui salinan lokal & render halaman SEKARANG JUGA, tidak menunggu v4LoadCore()
        // (~15 query) selesai -- kartu langsung pindah dari daftar menunggu ke riwayat.
        x.status=status; x.approvedBy=currentUser.name; x.approvedAt=approvedAt; x.reason=reason;
        v4RenderApprovals();
        // FIX: notifikasi & audit dibungkus terpisah. Dulu kalau salah satunya melempar error,
        // .catch() di bawah menampilkan "Gagal menyimpan" padahal status SUDAH tersimpan, dan
        // v4LoadCore() (yang menyegarkan halaman) di baris berikutnya TIDAK PERNAH jalan.
        try{
          v4Notify(status==='APPROVED'?'Approval disetujui':'Approval ditolak',`${x.title||x.type}: ${status}.`,'SUCCESS',x.requestedByKey,x.type,key);
          v4Audit('APPROVAL_'+status,x.type,key,{status:statusLama},{status});
        }catch(e){ console.warn('[SI MAMBA] Notifikasi/audit approval gagal (status sudah tersimpan):',e); }
        toast(status==='APPROVED'?'✅ Disetujui':'↩️ Ditolak');
        v4LoadCore();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4RefreshTasks(){
      const tasks=[]; const today=v4Date();
      const journals=(allJournals||[]).filter(x=>x.tanggal===today&&(x.guruKey?x.guruKey===currentUser?.key:x.guru===currentUser?.name)&&(!x.status||x.status==='DRAFT'));
      journals.forEach(x=>tasks.push({title:'Jurnal belum selesai',meta:`${x.kelas||'-'} · ${x.mataPelajaran||x.subject||'-'}`,page:'journal',type:'ACTION'}));
      V4.approvals.filter(x=>x.status==='PENDING'&&v4CanHead()).forEach(x=>tasks.push({title:`Approval ${x.type}`,meta:x.title||'Menunggu tindakan',page:'approval-v4',type:'APPROVAL'}));
      if(v4CanHead()){ (allJournals||[]).filter(j=>j.status==='pending').forEach(j=>tasks.push({title:'Approval jurnal susulan',meta:`${j.guru||'-'} · ${j.kelas||'-'} · ${j.tanggal||''}`,page:'approval-v4',type:'APPROVAL'})); (allEarlyLeaveRequests||[]).filter(r=>r.status==='pending').forEach(r=>tasks.push({title:'Approval pulang duluan',meta:`${r.guru||'-'} · ${r.tanggal||''}`,page:'approval-v4',type:'APPROVAL'})); }
      V4.tasks=tasks;const summary=document.getElementById('v4TaskSummary');if(summary)summary.innerHTML=`<div class="v4-card"><div class="v4-muted">Perlu tindakan</div><div class="v4-kpi">${tasks.length}</div></div><div class="v4-card"><div class="v4-muted">Hari ini</div><div class="v4-kpi">${tasks.filter(x=>x.meta?.includes(today)).length}</div></div>`;const list=document.getElementById('v4TaskList');if(list)list.innerHTML=tasks.map(t=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">${t.type==='APPROVAL'?'👑':'📝'} ${v4Safe(t.title)}</div><div class="v4-task-meta">${v4Safe(t.meta)}</div></div><button class="btn btn-primary" style="padding:6px 10px;font-size:11px;min-height:36px;" onclick="navigateTo('${t.page}')">Buka</button></div>`).join('')||'<p class="v4-muted">🎉 Tidak ada tugas mendesak.</p>';
    }

    // -------- Raport --------
    function v4IsiSiswaRaport(keepKey){const c=document.getElementById('v4ReportClass'),s=document.getElementById('v4ReportStudent');if(!c||!s)return;const cls=c.value;const list=(allSiswa||[]).filter(x=>x.kelas===cls).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id'));s.innerHTML=list.map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)}</option>`).join('');if(keepKey&&list.some(x=>x.key===keepKey))s.value=keepKey;else if(list.length)s.selectedIndex=0;}
    function v4ReportKelasBerubah(){v4IsiSiswaRaport();v4RenderReportPreview();}
    function v4PopulateReport(){const c=document.getElementById('v4ReportClass'),s=document.getElementById('v4ReportStudent');if(!c||!s)return;const scope=siswaScopeKelas();const classes=[...new Set((allSiswa||[]).map(x=>x.kelas).filter(k=>k&&scope.includes(k)))];const kelasLama=c.value,siswaLama=s.value;c.innerHTML=classes.map(x=>`<option>${v4Safe(x)}</option>`).join('');if(classes.includes(kelasLama))c.value=kelasLama;v4IsiSiswaRaport(siswaLama);v4RenderReportPreview();}
    // Ringkasan absensi Sholat Dhuha/Dzuhur seorang siswa untuk tahun ajaran berjalan --
    // dipakai di preview raport & disimpan ke snapshot saat raport difinalisasi.
    // Status absensi kegiatan: 'H' (format input saat ini); 'Hadir' diterima untuk data lama.
    // v8.401: data raport per SEMESTER aktif (konsisten dengan kehadiran & nilai). Tahun ajaran dicocokkan lewat
    // sesuaiTahunAjaranTermasukDataLama; semester dari tanggal catatan (Jan-Jun Genap, Jul-Des Ganjil). Tanggal tak terbaca = tetap ikut.
    function v4DalamSemester(r){return !!r&&sesuaiTahunAjaranTermasukDataLama(r)&&((v4SemesterDariTanggal(r.tanggal)||currentSemesterAktif)===currentSemesterAktif);}
    function v4StatusHadir(r) { return r && (r.status === 'H' || r.status === 'Hadir'); }
    function v4HitungSholatSiswa(studentKey) {
      const dluhaTypes = v4CariJenisKegiatanSholat('Dluha').map(t => t.key);
      const dzuhurTypes = v4CariJenisKegiatanSholat('Dzuhur').map(t => t.key);
      const recs = (V4.activityAttendance || []).filter(r => r.studentId === studentKey && r.tahunAjaran === currentTahunAjaran && v4DalamSemester(r));
      // FIX: status absensi kegiatan disimpan sebagai kode 'H'/'S'/'I'/'A' (lihat v4SaveActivityAttendance),
      // bukan 'Hadir' -- perbandingan lama membuat jumlah hadir selalu 0. Record berstatus null
      // (pilihan dibatalkan guru) tidak dihitung sebagai tercatat.
      const dluhaRecs = recs.filter(r => r.status && dluhaTypes.includes(r.activityTypeId));
      const dzuhurRecs = recs.filter(r => r.status && dzuhurTypes.includes(r.activityTypeId));
      return {
        dluhaHadir: dluhaRecs.filter(v4StatusHadir).length, dluhaTotal: dluhaRecs.length,
        dzuhurHadir: dzuhurRecs.filter(v4StatusHadir).length, dzuhurTotal: dzuhurRecs.length,
        records: recs
      };
    }
    // Ringkasan progres SKU Pramuka seorang siswa -- dipakai di preview raport & snapshot
    // finalisasi. Pakai v4PramukaProgress() yang sama dengan yang dipakai di halaman Pramuka,
    // supaya angka yang tampil di raport selalu konsisten dengan yang pembina isi di sana.
    function v4HitungPramukaSiswa(studentKey, kelas) {
      const tingkat = pramukaTingkatForKelas(kelas);
      const prog = v4PramukaProgress(studentKey, tingkat);
      return { tingkat, tingkatLabel: PRAMUKA_SKU[tingkat].label, done: prog.done, totalItems: prog.totalItems, pct: prog.pct };
    }
    // Ringkasan kehadiran Ekskul (di luar Pramuka) seorang siswa untuk tahun ajaran berjalan --
    // dikelompokkan per nama ekskul, karena satu siswa bisa ikut lebih dari satu ekskul sekaligus
    // (mis. Drumband & Silat). Sumbernya V4.ekskulAttendance, yang sebelumnya ditulis oleh
    // v4SaveEkskulAttendance tapi tidak pernah dimuat balik ke aplikasi -- sekarang dimuat di
    // v4LoadCore() supaya bisa dipakai di sini.
    function v4HitungEkskulSiswa(studentKey) {
      const recs = (V4.ekskulAttendance || []).filter(r => r.studentId === studentKey && r.tahunAjaran === currentTahunAjaran && v4DalamSemester(r));
      const grouped = {};
      recs.forEach(r => {
        if (!grouped[r.ekskulName]) grouped[r.ekskulName] = { nama: r.ekskulName, hadir: 0, total: 0 };
        grouped[r.ekskulName].total += 1;
        if (r.status === 'Hadir') grouped[r.ekskulName].hadir += 1;
      });
      return Object.values(grouped);
    }
    // ===== PERBAIKAN RAPORT v8.400: kehadiran per siswa, Catatan Wali Kelas, header Tahun Ajaran/Semester =====
    // Semester dari tanggal "YYYY-MM-DD": Jan-Jun = Genap, Jul-Des = Ganjil (sama dengan getSemesterOtomatis()).
    function v4SemesterDariTanggal(t){const m=/^(\d{4})-(\d{1,2})/.exec(String(t||'').trim());if(!m)return null;return parseInt(m[2],10)<=6?'Genap':'Ganjil';}
    // Jumlah H/S/I/A SATU siswa pada semester aktif (bukan jumlah catatan kelas). Kode status: H, S, I, A (Alfa).
    function v4HitungKehadiranSiswa(st){
      const r={H:0,S:0,I:0,A:0,total:0};
      (allAttendance||[]).forEach(a=>{
        if(!a||a.kelas!==st.kelas||!sesuaiTahunAjaranTermasukDataLama(a))return;
        if(v4SemesterDariTanggal(a.tanggal)!==currentSemesterAktif)return;
        const s=a.data&&a.data[st.key];
        if(typeof s==='string'&&['H','S','I','A'].includes(s)){r[s]++;r.total++;}
      });
      return r;
    }
    function v4KehadiranRaporHtml(k){
      if(!k.total)return '<p class="v4-muted">Belum ada catatan kehadiran semester '+v4Safe(currentSemesterAktif)+'.</p>';
      const pct=Math.round(k.H/k.total*100);
      return '<div class="v4-table-wrap"><table><thead><tr><th>Sakit</th><th>Izin</th><th>Alfa</th><th>Hadir</th></tr></thead><tbody><tr><td>'+k.S+' hari</td><td>'+k.I+' hari</td><td>'+k.A+' hari</td><td>'+k.H+' hari ('+pct+'%)</td></tr></tbody></table></div><p class="v4-muted">Dari '+k.total+' hari absensi tercatat.</p>';
    }
    // Catatan Wali Kelas: node report_notes_v4/<kunci raport> (lihat _catatan/rules-report_notes_v4.txt).
    // Cache di memori; gagal baca (mis. Rules belum dipasang) = dianggap kosong, tidak mengulang.
    window._raporCatatanCache=window._raporCatatanCache||{};
    function v4MuatCatatanRapor(kunci){
      const C=window._raporCatatanCache;
      const baca=db.ref('report_notes_v4/'+kunci).once('value').then(s=>{const v=s.val();C[kunci]=(v&&typeof v.catatan==='string')?v.catatan:'';},()=>{C[kunci]='';});
      return Promise.race([baca,new Promise(r=>setTimeout(r,8000))]).then(()=>{if(C[kunci]===undefined)C[kunci]='';});
    }
    function v4PastikanCatatan(st){
      const k=raporKunciKey(st.key,currentTahunAjaran,currentSemesterAktif);
      if(window._raporCatatanCache[k]!==undefined)return;
      window._raporCatatanMuat=window._raporCatatanMuat||{};
      if(window._raporCatatanMuat[k])return;
      window._raporCatatanMuat[k]=true;
      v4MuatCatatanRapor(k).then(()=>{delete window._raporCatatanMuat[k];v4RenderReportPreview();});
    }
    function v4RaporCatatanHtml(c){
      return '<h4 style="margin:12px 0 6px;">📝 Catatan Wali Kelas</h4>'+(c===undefined?'<p class="v4-muted">Memuat catatan...</p>':(c?'<p style="white-space:pre-wrap;">'+v4Safe(c)+'</p>':'<p class="v4-muted">Belum ada catatan wali kelas.</p>'));
    }
    function v4TambahTombolCatatan(){
      const fin=document.querySelector('button[onclick="v4FinalizeReport()"]');
      if(!fin||document.getElementById('btnCatatanRaport'))return;
      const b=document.createElement('button');b.id='btnCatatanRaport';b.className='btn btn-soft';b.textContent='📝 Catatan Wali Kelas';b.onclick=v4EditCatatanRapor;fin.parentNode.insertBefore(b,fin.nextSibling);
    }
    function v4EditCatatanRapor(){
      const s=document.getElementById('v4ReportStudent');const st=(allSiswa||[]).find(x=>x.key===s?.value);
      if(!st)return toast('Pilih siswa!',true);
      if(!(v4IsAdmin()||(isWaliKelasAssigned()&&currentUser.waliKelasOf===st.kelas)))return toast('Hanya Wali Kelas dari kelas siswa ini atau Admin!',true);
      if(!v4RaporPeriode().aktif)return toast('Catatan hanya bisa diubah pada periode aktif.',true);
      const kunci=raporKunciKey(st.key,currentTahunAjaran,currentSemesterAktif);
      raporTerkunciSet(true).then(set=>{
        if(set.has(kunci))return toast('🔒 Raport sudah difinalisasi. Ubah lewat tombol "Ajukan Koreksi".',true,6000);
        const lama=window._raporCatatanCache[kunci]||'';
        const baru=prompt('Catatan Wali Kelas untuk '+st.name+' (maks. 300 karakter; kosongkan untuk menghapus):',lama);
        if(baru===null)return;
        const teks=baru.trim();
        if(teks.length>300)return toast('Catatan terlalu panjang ('+teks.length+' karakter). Maksimal 300.',true,5000);
        const ref=db.ref('report_notes_v4/'+kunci);
        return ((typeof isAdmin==='function'&&isAdmin())?adminSesiSiap():guruSesiSiap())
          .then(()=>teks?ref.set({studentId:st.key,kelas:st.kelas,tahunAjaran:currentTahunAjaran,semester:currentSemesterAktif,catatan:teks,oleh:currentUser.name||'',ts:new Date().toISOString()}):ref.remove())
          .then(()=>{window._raporCatatanCache[kunci]=teks;toast(teks?'📝 Catatan tersimpan':'Catatan dihapus');v4RenderReportPreview();});
      }).catch(err=>{
        console.error('[SI MAMBA] Gagal simpan catatan raport:',err);
        const denied=err&&(err.code==='PERMISSION_DENIED'||/permission_denied/i.test(String(err.message||err)));
        toast(denied?'❌ Ditolak server. Pasang blok Rules report_notes_v4 dulu (lihat _catatan/rules-report_notes_v4.txt).':'❌ Gagal menyimpan: '+(err&&err.message||err),true,7000);
      });
    }
    // ===== v8.401: raport final dibaca dari SNAPSHOT, pilihan periode, Sikap per semester =====
    // Data selalu per SEMESTER. Bila raport periode itu sudah LOCKED (report_locks_v4), isi diambil dari report_cards_v4/<snapshotKey>
    // sehingga tidak berubah walau absensi/tahfidz/sikap diisi atau dikoreksi sesudah finalisasi, dan raport semester lama tetap bisa dicetak.
    function v4RaporAktif(){return currentTahunAjaran+'|'+currentSemesterAktif;}
    function v4RaporPeriode(){
      const v=String(window._raporPeriodeSel||v4RaporAktif()).split('|');
      return {tahun:v[0],semester:v[1],aktif:(v[0]===currentTahunAjaran&&v[1]===currentSemesterAktif)};
    }
    function v4TahunAjaranSebelum(ta){const m=/^(\d{4})\/(\d{4})$/.exec(String(ta||''));return m?(parseInt(m[1],10)-1)+'/'+(parseInt(m[2],10)-1):null;}
    function v4TambahPilihPeriode(){
      const sSiswa=document.getElementById('v4ReportStudent');if(!sSiswa)return;
      let sel=document.getElementById('v4ReportPeriode');
      if(sel&&sel.dataset.aktif===v4RaporAktif())return;
      const opsi=[[currentTahunAjaran,currentSemesterAktif]];
      if(currentSemesterAktif==='Genap')opsi.push([currentTahunAjaran,'Ganjil']);
      const sebelum=v4TahunAjaranSebelum(currentTahunAjaran);
      if(sebelum){opsi.push([sebelum,'Genap']);opsi.push([sebelum,'Ganjil']);}
      const html=opsi.map((o,i)=>'<option value="'+v4Safe(o[0])+'|'+o[1]+'">'+v4Safe(o[0])+' · '+o[1]+(i===0?' (aktif)':'')+'</option>').join('');
      if(!sel){
        const box=document.createElement('div');box.style.marginTop='10px';
        box.innerHTML='<label class="label">Periode Raport</label><select id="v4ReportPeriode" class="field" onchange="window._raporPeriodeSel=this.value;v4RenderReportPreview()"></select>';
        (sSiswa.closest('.v4-grid-2')||sSiswa.parentNode).insertAdjacentElement('afterend',box);
        sel=box.querySelector('select');
      }
      sel.innerHTML=html;sel.dataset.aktif=v4RaporAktif();sel.value=v4RaporAktif();window._raporPeriodeSel=v4RaporAktif();
    }
    function v4InfoKunciCache(kunci){const C=window._raporLockInfo;const c=C&&C[kunci];return(c&&Date.now()-c.t<10000)?c:null;}
    function v4InfoKunciRapor(kunci){
      const hit=v4InfoKunciCache(kunci);if(hit)return Promise.resolve(hit.v);
      const C=window._raporLockInfo||(window._raporLockInfo={});
      return Promise.race([db.ref('report_locks_v4/'+kunci).once('value').then(s=>{const v=s.val()||null;C[kunci]={t:Date.now(),v};return v;}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000))]);
    }
    function v4MuatSnapshotRapor(key){
      const C=window._raporSnapCache||(window._raporSnapCache={});
      if(C[key])return Promise.resolve(C[key]);
      return Promise.race([db.ref('report_cards_v4/'+key).once('value').then(s=>{const v=s.val();if(!v)throw new Error('snapshot kosong');C[key]=v;return v;}),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000))]);
    }
    // Sikap & Kedisiplinan: SEMESTER aktif saja (v8.401; sebelumnya akumulasi semua waktu). Predikat = panduan cepat wali kelas, bukan nilai baku.
    function v4HitungSikapSiswa(siswaKey){
      const items=(allKedisiplinan||[]).filter(d=>d.siswaKey===siswaKey&&v4DalamSemester(d));
      const sum=j=>items.filter(d=>d.jenis===j).reduce((s,d)=>s+(d.poin||0),0);
      const rincian=items.slice().sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''),(a.tanggal||''))).slice(0,10).map(d=>({jenis:d.jenis||'',kategori:d.kategori||'-',poin:d.poin||0,tanggal:d.tanggal||'-'}));
      return {pelanggaran:sum('pelanggaran'),prestasi:sum('prestasi'),rincian};
    }
    function v4RaporSikapHtmlDari(sk){
      const net=sk.prestasi-sk.pelanggaran;
      const predikat=net>=0?'Baik':(net>=-20?'Cukup':'Perlu Perhatian Khusus');
      const warna=net>=0?'#059669':(net>=-20?'#d97706':'#dc2626');
      const rincian=sk.rincian&&sk.rincian.length?sk.rincian.map(d=>'<p class="v4-muted">'+(d.jenis==='prestasi'?'🌟':'⚠️')+' '+v4Safe(d.kategori)+' ('+d.poin+' poin) — '+v4Safe(d.tanggal)+'</p>').join(''):'<p class="v4-muted">Belum ada catatan sikap semester ini.</p>';
      return '<h4 style="margin:12px 0 6px;">🌟 Sikap &amp; Kedisiplinan</h4><p>Predikat: <strong style="color:'+warna+';">'+predikat+'</strong> (Poin pelanggaran: '+sk.pelanggaran+', Poin prestasi: '+sk.prestasi+')</p>'+rincian;
    }
    function v4RaporSikapHtml(siswaKey){return v4RaporSikapHtmlDari(v4HitungSikapSiswa(siswaKey));}
    // Cadangan bila thfRaporHtml() (tahfidz-grafik.js) tidak termuat: tabel 10 setoran terbaru, bukan sekadar jumlah.
    function v4TahfidzRaporFallback(t){
      if(!t.length)return '<p class="v4-muted">Belum ada catatan tahfidz semester ini.</p>';
      const baris=t.slice().sort((a,b)=>COLLATOR_ID.compare(String(b.tanggal||''),String(a.tanggal||''))).slice(0,10).map(x=>'<tr><td>'+v4Safe(x.tanggal||'-')+'</td><td>'+v4Safe(x.surah||'-')+'</td><td>'+v4Safe(x.ayat||'-')+'</td><td>'+v4Safe(x.type||'-')+'</td></tr>').join('');
      return '<div class="v4-table-wrap"><table><thead><tr><th>Tanggal</th><th>Surah</th><th>Ayat</th><th>Jenis</th></tr></thead><tbody>'+baris+'</tbody></table></div><p class="v4-muted">'+t.length+' catatan setoran/murojaah'+(t.length>10?' (10 terbaru ditampilkan)':'')+'.</p>';
    }
    function v4RaporDataLive(st){
      const kunci=raporKunciKey(st.key,currentTahunAjaran,currentSemesterAktif);
      return {
        tahun:currentTahunAjaran,semester:currentSemesterAktif,
        grades:(allGrades||[]).filter(x=>x.siswaKey===st.key&&(!x.semester||x.semester===currentSemesterAktif)&&sesuaiTahunAjaranTermasukDataLama(x)),
        kehadiran:v4HitungKehadiranSiswa(st),
        tahfidz:(V4.tahfidz||[]).filter(x=>x.studentId===st.key&&v4DalamSemester(x)),
        sholat:v4HitungSholatSiswa(st.key),pramuka:v4HitungPramukaSiswa(st.key,st.kelas),ekskul:v4HitungEkskulSiswa(st.key),
        sikap:v4HitungSikapSiswa(st.key),catatan:window._raporCatatanCache[kunci],final:null
      };
    }
    function v4RaporDataSnap(st,snap){
      const src=snap.source||{};const A=x=>Array.isArray(x)?x:(x&&typeof x==='object'?Object.values(x):[]);
      let keh=src.kehadiran;
      if(!keh){keh={H:0,S:0,I:0,A:0,total:0};A(src.attendance).forEach(a=>{if(!a||v4SemesterDariTanggal(a.tanggal)!==snap.semester)return;const sv=a.data&&a.data[st.key];if(typeof sv==='string'&&['H','S','I','A'].includes(sv)){keh[sv]++;keh.total++;}});}
      const sk=src.sikap?{pelanggaran:src.sikap.pelanggaran||0,prestasi:src.sikap.prestasi||0,rincian:A(src.sikap.rincian)}:null;
      return {
        tahun:snap.tahunAjaran,semester:snap.semester,grades:A(src.grades),kehadiran:keh,
        tahfidz:A(src.tahfidz).filter(x=>x&&(v4SemesterDariTanggal(x.tanggal)||snap.semester)===snap.semester),
        sholat:src.sholat||{dluhaHadir:0,dluhaTotal:0,dzuhurHadir:0,dzuhurTotal:0},pramuka:src.pramuka||null,ekskul:A(src.ekskul),
        sikap:sk||v4HitungSikapSiswa(st.key),catatan:src.catatanWaliKelas||'',
        final:{oleh:snap.finalizedBy||'',waktu:snap.finalizedAt||''}
      };
    }
    function v4RaporHtml(st,D){
      const adaSem=D.grades.slice(0,30).some(g=>g.data&&statusRapor(g.data).nilai!==null&&!statusRapor(g.data).final);
      const nilaiRows=D.grades.slice(0,30).map(g=>'<tr><td>'+v4Safe(g.subject||'-')+'</td><td>'+(()=>{const r=g.data?statusRapor(g.data):{nilai:null};return r.nilai===null?'-':(r.final?v4Safe(r.nilai):raporSementaraHtml(r.nilai));})()+'</td></tr>').join('')||'<tr><td colspan="2">Belum ada nilai.</td></tr>';
      const ekskulHtml=D.ekskul.length?D.ekskul.map(x=>'<p class="v4-muted">'+v4Safe(x.nama)+': '+x.hadir+'/'+x.total+' hadir'+(x.total?' ('+Math.round(x.hadir/x.total*100)+'%)':'')+'</p>').join(''):'<p class="v4-muted">Belum ada catatan kehadiran ekskul.</p>';
      let tahfidzHtml;try{tahfidzHtml=typeof thfRaporHtml==='function'?thfRaporHtml(st,D.tahfidz):v4TahfidzRaporFallback(D.tahfidz);}catch(e){console.warn('[SI MAMBA] thfRaporHtml gagal:',e);tahfidzHtml=v4TahfidzRaporFallback(D.tahfidz);}
      const s=D.sholat,p=D.pramuka;
      const pct=(h,t)=>t?' ('+Math.round(h/t*100)+'%)':'';
      const pramukaHtml=p?'<h4 style="margin:12px 0 6px;">🏕️ Pramuka ('+v4Safe(p.tingkatLabel)+')</h4><p class="v4-muted">SKU tercapai: '+p.done+'/'+p.totalItems+' poin ('+p.pct+'%)</p>':'';
      const finalHtml=D.final?'<p style="font-size:12px;color:#6b7280;margin:2px 0 0;text-align:center;">🔒 Raport final'+(D.final.oleh?' · difinalisasi oleh '+v4Safe(D.final.oleh):'')+(D.final.waktu?' · '+v4Safe(new Date(D.final.waktu).toLocaleDateString('id-ID')):'')+'</p>':'';
      return (typeof generateKopSuratHTML==='function'?generateKopSuratHTML():'')
        +'<div class="header">RAPORT PESERTA DIDIK</div><div class="sub-header">'+v4Safe(st.name)+' · '+v4Safe(st.kelas)+'</div>'
        +'<div class="sub-header" style="font-size:13px;">Tahun Ajaran '+v4Safe(D.tahun)+' · Semester '+v4Safe(D.semester)+'</div>'+finalHtml
        +'<h4 style="margin:10px 0 6px;">Nilai</h4><div class="v4-table-wrap"><table><thead><tr><th>Mapel</th><th>Nilai</th></tr></thead><tbody>'+nilaiRows+'</tbody></table></div>'
        +(adaSem?'<p style="color:#6b7280;font-size:12px;font-style:italic;margin:4px 0 0;">Nilai berlabel sementara belum final. Angka menjadi final setelah minimal satu NH, MID, dan PAS terisi.</p>':'')
        +'<h4 style="margin:12px 0 6px;">Kehadiran</h4>'+v4KehadiranRaporHtml(D.kehadiran)
        +'<h4 style="margin:12px 0 6px;">Tahfidz</h4>'+tahfidzHtml
        +'<h4 style="margin:12px 0 6px;">☀️🕌 Sholat Dhuha &amp; Dzuhur</h4><p class="v4-muted">Dhuha: '+s.dluhaHadir+'/'+s.dluhaTotal+' hadir'+pct(s.dluhaHadir,s.dluhaTotal)+' · Dzuhur: '+s.dzuhurHadir+'/'+s.dzuhurTotal+' hadir'+pct(s.dzuhurHadir,s.dzuhurTotal)+'</p>'
        +pramukaHtml
        +'<h4 style="margin:12px 0 6px;">🎯 Ekstrakurikuler Lain</h4>'+ekskulHtml
        +v4RaporSikapHtmlDari(D.sikap)+v4RaporCatatanHtml(D.catatan)
        +'<div style="margin-top:24px;text-align:right;padding-right:20px;"><p>Mengetahui,<br>Kepala '+v4Safe(MADRASAH.nama)+'</p>'+(MADRASAH.ttdKepalaBase64?'<img src="'+MADRASAH.ttdKepalaBase64+'" alt="Tanda tangan" style="max-height:45px;display:block;margin:6px 0 6px auto;">':'<br><br><br>')+'<p style="text-decoration:underline;">'+v4Safe(MADRASAH.kepala_sekolah)+'</p><p>NIP. '+v4Safe(MADRASAH.nip_kepala_sekolah)+'</p></div>';
    }
    function v4RenderLive(st,el,peringatan){
      try{v4PastikanCatatan(st);}catch(e){}
      if(!v4ActSiap(v4ActBulanTahunAjaran())){el.innerHTML='<p class="v4-muted">⏳ Memuat absensi sholat satu tahun ajaran...</p>';v4ActPastikan(v4ActBulanTahunAjaran()).then(()=>v4RenderReportPreview());return;}
      el.innerHTML=(peringatan?'<p class="no-print" style="color:#b45309;font-size:12px;margin:0 0 8px;">'+v4Safe(peringatan)+'</p>':'')+v4RaporHtml(st,v4RaporDataLive(st));
    }
    function v4RenderReportPreview(){
      const c=document.getElementById('v4ReportClass'),s=document.getElementById('v4ReportStudent'),el=document.getElementById('v4ReportPreview');
      if(!c||!s||!el)return;
      try{v4TambahTombolAdminKunci();}catch(e){}try{v4TambahTombolCatatan();}catch(e){}try{v4TambahPilihPeriode();}catch(e){}
      const st=(allSiswa||[]).find(x=>x.key===s.value);
      if(!st){el.innerHTML='<p class="v4-muted">Pilih siswa.</p>';return;}
      const per=v4RaporPeriode(),kunci=raporKunciKey(st.key,per.tahun,per.semester);
      const seq=(window._raporRenderSeq=(window._raporRenderSeq||0)+1),masihBerlaku=()=>seq===window._raporRenderSeq;
      if(!v4InfoKunciCache(kunci))el.innerHTML='<p class="v4-muted">⏳ Memuat raport...</p>';
      const periodeTeks='Tahun Ajaran '+per.tahun+' · Semester '+per.semester;
      v4InfoKunciRapor(kunci).then(lock=>{
        if(!masihBerlaku())return;
        if(lock&&lock.status==='LOCKED'&&lock.snapshotKey){
          return v4MuatSnapshotRapor(lock.snapshotKey).then(snap=>{if(masihBerlaku())el.innerHTML=v4RaporHtml(st,v4RaporDataSnap(st,snap));},err=>{
            console.warn('[SI MAMBA] Snapshot raport gagal dimuat:',err);if(!masihBerlaku())return;
            if(per.aktif)v4RenderLive(st,el,'⚠️ Arsip raport final gagal dimuat; yang tampil data terbaru, bukan arsip. Muat ulang untuk mencoba lagi.');
            else el.innerHTML='<p class="v4-muted">⚠️ Arsip raport '+v4Safe(periodeTeks)+' gagal dimuat. Periksa koneksi lalu pilih periode lagi.</p>';
          });
        }
        if(!per.aktif){el.innerHTML='<p class="v4-muted">Raport '+v4Safe(periodeTeks)+' belum difinalisasi, jadi belum ada arsip yang bisa ditampilkan. Pilih periode aktif untuk melihat data terbaru.</p>';return;}
        v4RenderLive(st,el,'');
      },err=>{
        console.warn('[SI MAMBA] Status kunci raport tidak terbaca:',err);if(!masihBerlaku())return;
        if(per.aktif)v4RenderLive(st,el,'⚠️ Status kunci raport tidak terbaca; yang tampil data terbaru.');
        else el.innerHTML='<p class="v4-muted">⚠️ Status raport '+v4Safe(periodeTeks)+' gagal dimuat. Periksa koneksi lalu pilih periode lagi.</p>';
      });
    }
    function v4FinalizeReport(){const s=document.getElementById('v4ReportStudent');const st=(allSiswa||[]).find(x=>x.key===s?.value);if(!st)return toast('Pilih siswa!',true);if(!v4RaporPeriode().aktif)return toast('Finalisasi hanya untuk periode aktif. Pilih periode yang bertanda (aktif).',true,5000);if(!v4ActSiap(v4ActBulanTahunAjaran())){toast('Memuat absensi sholat satu tahun ajaran, mohon tunggu...',false,4000);v4ActPastikan(v4ActBulanTahunAjaran()).then(ok=>{if(ok)v4FinalizeReport();else toast('Gagal memuat absensi sholat setahun. Periksa koneksi lalu coba lagi.',true);});return;}
      // Wali Kelas hanya boleh finalisasi raport siswa DI KELAS YANG DIA AMPU -- sebelumnya
      // cek cuma "apakah dia wali kelas di kelas mana pun" (isWaliKelasAssigned()), sehingga
      // wali kelas 1A misalnya bisa mengunci raport siswa 6B kalau tahu cara memanggil fungsi
      // ini langsung. Sekarang harus cocok persis dengan kelas siswa yang dipilih.
      if(!(v4IsAdmin()||v4IsHead()||(isWaliKelasAssigned()&&currentUser.waliKelasOf===st.kelas)))return toast('Hanya Wali Kelas dari kelas siswa ini/Admin/Kepala!',true);
      // PERINGATAN: nilai yang masih SEMENTARA (NH, MID, atau PAS belum lengkap) ikut terkunci kalau raport difinalisasi sekarang.
      const _mapelSem=(allGrades||[]).filter(x=>x.siswaKey===st.key&&x.data&&(!x.semester||x.semester===currentSemesterAktif)&&sesuaiTahunAjaranTermasukDataLama(x)).map(x=>({m:x.subject||'-',s:statusRapor(x.data)})).filter(o=>o.s.nilai!==null&&!o.s.final).map(o=>o.m);
      if(_mapelSem.length&&!confirm(`⚠️ ${_mapelSem.length} mapel masih bernilai SEMENTARA (NH, MID, atau PAS belum lengkap):\n\n- ${_mapelSem.join('\n- ')}\n\nJika difinalisasi sekarang, raport ${st.name} dikunci dengan nilai yang belum lengkap dan koreksinya harus lewat pengajuan Approval.\n\nTetap finalisasi?`))return;
      const tahunFin=currentTahunAjaran,semFin=currentSemesterAktif,kunciFin=raporKunciKey(st.key,tahunFin,semFin);
      ((typeof isAdmin==='function'&&isAdmin())?adminSesiSiap():guruSesiSiap()).then(()=>Promise.all([db.ref('report_locks_v4/'+kunciFin).once('value'),v4MuatCatatanRapor(kunciFin)]).then(r=>r[0])).then(ls=>{
        const lv=ls.val();
        if(lv&&lv.status==='LOCKED')return toast('🔒 Raport '+st.name+' semester '+semFin+' sudah difinalisasi. Untuk mengubahnya klik "Ajukan Koreksi" dan tunggu persetujuan Admin/Kepala.',true,7000);
        const ref=db.ref('report_cards_v4').push();
        // Snapshot HANYA memuat data siswa ini (bukan seluruh kelas): nilai semester/tahun ajaran ini + kehadiran miliknya.
        const snapshot={studentId:st.key,studentName:st.name,kelas:st.kelas,finalizedBy:currentUser.name,finalizedAt:new Date().toISOString(),status:'LOCKED',tahunAjaran:tahunFin,semester:semFin,source:{grades:(allGrades||[]).filter(g=>g.siswaKey===st.key&&(!g.semester||g.semester===semFin)&&sesuaiTahunAjaranTermasukDataLama(g)),attendance:(allAttendance||[]).filter(a=>a.kelas===st.kelas&&sesuaiTahunAjaranTermasukDataLama(a)&&a.data&&a.data[st.key]!==undefined).map(a=>Object.assign({},a,{data:{[st.key]:a.data[st.key]}})),tahfidz:(V4.tahfidz||[]).filter(t=>t.studentId===st.key&&v4DalamSemester(t)),sholat:v4HitungSholatSiswa(st.key),pramuka:v4HitungPramukaSiswa(st.key,st.kelas),ekskul:v4HitungEkskulSiswa(st.key),kehadiran:v4HitungKehadiranSiswa(st),catatanWaliKelas:(window._raporCatatanCache||{})[kunciFin]||'',sikap:v4HitungSikapSiswa(st.key)}};
        const updates={};updates['report_cards_v4/'+ref.key]=snapshot;updates['report_locks_v4/'+kunciFin]={studentId:st.key,studentName:st.name,kelas:st.kelas,tahunAjaran:tahunFin,semester:semFin,status:'LOCKED',snapshotKey:ref.key,lockedBy:currentUser.name,lockedAt:snapshot.finalizedAt};
        return db.ref().update(updates).then(()=>{window._raporKunciCache=null;window._raporLockInfo=null;v4Audit('FINALIZE_REPORT','REPORT',ref.key,null,snapshot);v4Notify('Raport difinalisasi',`Raport ${st.name} telah dikunci.`,'SUCCESS',currentUser.key,'REPORT',ref.key);toast('🔒 Raport difinalisasi');v4RenderReportPreview();});
      }).catch(err=>{console.error('[SI MAMBA] Gagal finalisasi raport:',err);toast('❌ Gagal finalisasi: '+(err&&err.message||err),true);});}
    // ADMIN: buat node kunci (report_locks_v4) dari raport yang difinalisasi SEBELUM fitur pengunci ada.
    // Aman dijalankan berulang: kunci yang sudah ada (termasuk UNLOCKED) tidak ditimpa.
    function v4TambahTombolAdminKunci(){
      if(!v4IsAdmin())return;const fin=document.querySelector('button[onclick="v4FinalizeReport()"]');
      if(!fin||document.getElementById('btnKunciRaportLama'))return;
      const b=document.createElement('button');b.id='btnKunciRaportLama';b.className='btn';b.textContent='🛠️ Kunci Raport Lama';b.title='Admin: buat penanda kunci untuk raport yang sudah difinalisasi sebelum fitur pengunci ada';b.onclick=v4BuatKunciRaportLama;fin.parentNode.appendChild(b);
    }
    function v4BuatKunciRaportLama(){
      if(!v4IsAdmin())return toast('Hanya Admin!',true);
      if(!confirm('Buat penanda kunci untuk semua raport yang sudah difinalisasi sebelumnya?\n\nKunci yang sudah ada tidak diubah. Proses membaca seluruh arsip raport, mungkin butuh beberapa detik.'))return;
      toast('⏳ Membaca arsip raport...',false,3000);
      db.ref('report_cards_v4').once('value').then(snap=>{
        const terbaru={};
        snap.forEach(ch=>{const r=ch.val();if(!r||!r.studentId||r.status!=='LOCKED'||!r.semester)return;const k=raporKunciKey(r.studentId,r.tahunAjaran,r.semester);if(!terbaru[k]||String(r.finalizedAt||'')>String(terbaru[k].finalizedAt||''))terbaru[k]={snapshotKey:ch.key,studentId:r.studentId,studentName:r.studentName||'',kelas:r.kelas||'',tahunAjaran:r.tahunAjaran||'',semester:r.semester,lockedBy:r.finalizedBy||'',lockedAt:r.finalizedAt||''};});
        const kunci=Object.keys(terbaru);if(!kunci.length)return toast('Tidak ada raport lama yang perlu dikunci.');
        return db.ref('report_locks_v4').once('value').then(ls=>{
          const ada=ls.val()||{};const updates={};let n=0;
          kunci.forEach(k=>{if(ada[k])return;updates['report_locks_v4/'+k]=Object.assign({status:'LOCKED'},terbaru[k]);n++;});
          if(!n)return toast('Semua raport lama sudah punya kunci.');
          return adminSesiSiap().then(()=>db.ref().update(updates)).then(()=>{window._raporKunciCache=null;window._raporLockInfo=null;toast('🔒 '+n+' raport lama dikunci.');});
        });
      }).catch(err=>{console.error('[SI MAMBA] Gagal membuat kunci raport lama:',err);toast('❌ Gagal: '+(err&&err.message||err),true);});
    }
    function v4RequestReportCorrection(){const s=document.getElementById('v4ReportStudent');const st=(allSiswa||[]).find(x=>x.key===s?.value);if(!st)return toast('Pilih siswa!',true);const per=v4RaporPeriode();const reason=prompt('Bagian raport yang perlu dikoreksi ('+per.tahun+' · '+per.semester+'):');if(!reason)return;db.ref('approval_requests_v4').push().set({type:'CORRECTION',title:`Koreksi raport ${st.name}`,requestedBy:currentUser.name,requestedByKey:currentUser.key||currentUser.name,status:'PENDING',studentId:st.key,semester:per.semester,reason,createdAt:new Date().toISOString(),tahunAjaran:per.tahun}).then(()=>{v4Notify('Pengajuan koreksi raport','Pengajuan koreksi telah dikirim.','ACTION',null,'REPORT_CORRECTION','');toast('📤 Pengajuan koreksi dikirim');v4LoadCore();}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });}
    function v4PrintReport(){const el=document.getElementById('v4ReportPreview');if(!el)return;const w=window.open('','_blank','width=900,height=700');if(!w)return toast('Popup diblokir browser.',true);
      // FIX: jendela popup kosong (window.open('', ...)) berbasis "about:blank", BUKAN alamat
      // halaman aplikasi. Akibatnya path relatif di dalam el.innerHTML (mis. logo kop surat
      // <img src="logo/logo-lembaga.png">) gagal dimuat di jendela cetak ini walau tampil normal
      // di preview halaman utama. Tag <base href> di bawah membuat SEMUA path relatif di jendela
      // cetak ini di-resolve relatif terhadap lokasi halaman utama, sehingga logo (dan aset
      // relatif lain) ikut muncul saat dicetak.
      // FIX: sebelumnya ikut menempelkan blok "Aturan Honor Guru Pengganti" (#aturan-honor-pengganti-v4)
      w.document.write(`<html><head><base href="${document.baseURI}"><title>Raport SI MAMBA</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:7px}th{background:#eee}@media print{button,.no-print{display:none}}</style></head><body>${el.innerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);}

