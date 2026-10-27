// ============================================================
// portal-ortu.js -- PORTAL ORANG TUA (dipecah dari app.js)
// ============================================================
// Isi: login No. WA + PIN, "Masuk pertama kali" (PIN otomatis), ingat perangkat, ganti PIN,
// dashboard anak (kehadiran, nilai, sikap, infaq + riwayat/tunggakan, tugas, saran & kritik).
// Dimuat SESUDAH js/app.js dan SEBELUM skrip lain (index.html). Tidak ada kode yang berjalan saat
// dimuat -- hanya deklarasi, jadi urutan ini aman. Memakai fungsi/variabel global dari app.js
// (db, toast, escapeHtml, MADRASAH, currentTahunAjaran, isoMingguKey, tglLokal, dst.).
// Tetap di app.js (dipakai sisi Guru/Admin juga): ortuEl(), ortuWaKey(), pilihLoginOrtu(),
// kembaliKeChooser(), serta daftar akun/Reset PIN untuk Admin (renderOrtuAkunAdmin, resetPinOrtu,
// editSiswaCekPinOrtu).
// ============================================================

    // ---------- Portal Orang Tua: login No. WA + PIN buatan sendiri ----------
    const ORTU_PIN_ITER = 5000, ORTU_MAX_GAGAL = 5, ORTU_KUNCI_MENIT = 10;
    let portalOrtuWaKey = null, portalOrtuAnak = [], portalOrtuBusy = false;
    function ortuPinValid(pin) { return /^[0-9]{6}$/.test(pin); }
    function ortuPinTerlaluMudah(pin) { return /^(\d)\1{5}$/.test(pin) || '01234567890123456789'.includes(pin) || '98765432109876543210'.includes(pin); }
    // PBKDF2 (bukan SHA-256 polos) supaya menebak PIN 6 angka dari hash yang bocor jauh lebih lambat.
    function ortuHashPin(pin, waKey) {
      return CryptoJS.PBKDF2(String(pin), 'simamba-ortu::' + waKey, { keySize: 256 / 32, iterations: ORTU_PIN_ITER, hasher: CryptoJS.algo.SHA256 }).toString(CryptoJS.enc.Hex);
    }
    function ortuTampilJam(ms) { return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
    function ortuPesanError(e) { return '❌ ' + ((e && e.tampil) || ('Gagal: ' + ((e && e.message) || e))); }
    function bukaPortalOrtuForm() {
      document.getElementById('loginChooser').style.display = 'none';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('portalOrtuLogin').style.display = 'flex';
      document.getElementById('portalOrtuDashboard').style.display = 'none';
      ['portalOrtuNoWa', 'portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      tampilFormBuatPinOrtu(false);
      ortuMasukOtomatis();
    }
    function tampilFormBuatPinOrtu(buat) {
      ortuEl('portalOrtuFormMasuk').style.display = buat ? 'none' : 'block';
      ortuEl('portalOrtuFormBuat').style.display = buat ? 'block' : 'none';
      ortuEl('portalOrtuError').textContent = '';
    }
    function tutupPortalOrtu() {
      // PIN yang dibuatkan otomatis belum tentu sudah dicatat orang tua: kalau keluar menghapusnya dari perangkat, mereka terkunci.
      const tersimpan = ortuPerangkatBaca();
      if (tersimpan && tersimpan.auto && !confirm(`PIN Anda dibuatkan otomatis dan hanya tersimpan di perangkat ini.\n\nPIN Anda: ${tersimpan.pin}\n\nCatat dulu PIN ini. Jika keluar, PIN dihapus dari perangkat ini dan Anda harus mengetik PIN itu untuk masuk lagi.\n\nTetap keluar?`)) return;
      ortuPerangkatLupa();
      const infoPin = document.getElementById('portalOrtuPinOtomatis'); if (infoPin) infoPin.remove();
      portalOrtuWaKey = null; portalOrtuAnak = [];
      ortuEl('portalOrtuContent').innerHTML = '';
      ['portalOrtuPinLama', 'portalOrtuPinGanti1', 'portalOrtuPinGanti2'].forEach(id => { ortuEl(id).value = ''; });
      kembaliKeChooser();
    }
    // Semua siswa yang nomor WA-nya sama (kakak-adik bisa berbagi satu nomor orang tua).
    // Cari anak berdasarkan nomor WA wali. Dulu: unduh SELURUH node siswa lalu cocokkan di browser (boros
    // kuota unduhan Spark, apalagi tiap wali murid login). Sekarang: query terindeks siswa/noWaKey
    // (butuh ".indexOn": ["noWaKey"] pada Rules path siswa, dan data diisi lewat migrasiNoWaKeyV1()).
    // Pengaman: kalau query terindeks tidak menemukan apa pun (mis. data belum dimigrasi), jatuh ke
    // pemindaian penuh lama -- tapi hanya SEKALI per sesi halaman, supaya salah ketik nomor berulang
    // tidak terus mengunduh semua siswa.
    let _ortuFallbackDipakai = false;
    function ortuBentukHasilAnak(snap, waKey, cocokkanManual) {
      const hasil = [];
      snap.forEach(c => {
        const x = c.val();
        if (!x || x.aktif === false) return;   // siswa NONAKTIF (pindah/keluar) tidak ditampilkan di Portal Orang Tua
        if (cocokkanManual ? (x.noWaOrtu && formatNomorWa(x.noWaOrtu) === waKey) : true) hasil.push({ key: c.key, ...x });
      });
      return hasil.sort((a, b) => COLLATOR_ID.compare((a.name || ''), b.name || ''));
    }
    function ortuCariAnak(waKey) {
      return db.ref('siswa').orderByChild('noWaKey').equalTo(waKey).once('value').then(snap => {
        const hasil = ortuBentukHasilAnak(snap, waKey, false);
        if (hasil.length || _ortuFallbackDipakai) return hasil;
        _ortuFallbackDipakai = true;
        return db.ref('siswa').once('value').then(semua => ortuBentukHasilAnak(semua, waKey, true));
      });
    }
    // Admin, sekali jalan: isi siswa/{key}/noWaKey untuk semua siswa yang sudah punya noWaOrtu valid.
    // Aman diulang (hanya menulis yang berbeda). Panggil dari Console: await migrasiNoWaKeyV1()
    async function migrasiNoWaKeyV1() {
      if (!isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!navigator.onLine) { toast('📡 Butuh koneksi internet untuk migrasi.', true); return null; }
      const snap = await db.ref('siswa').once('value');
      const updates = {}; let perlu = 0, total = 0;
      snap.forEach(c => {
        total++;
        const x = c.val() || {};
        const baru = x.noWaOrtu ? (ortuWaKey(x.noWaOrtu) || null) : null;
        if ((x.noWaKey || null) !== baru) { updates['siswa/' + c.key + '/noWaKey'] = baru; perlu++; }
      });
      if (perlu) await db.ref().update(updates);
      const ringkas = { totalSiswa: total, diperbarui: perlu };
      console.log('[SI MAMBA] migrasiNoWaKeyV1 selesai:', ringkas);
      toast(perlu ? ('✅ ' + perlu + ' data siswa diberi noWaKey.') : '✅ Semua data siswa sudah punya noWaKey.');
      return ringkas;
    }
    // Catat 1x salah PIN di server (bukan cuma di browser) -> terkunci 10 menit setelah 5x salah.
    function ortuCatatGagal(waKey) {
      return db.ref('ortu_akun/' + waKey).transaction(cur => {
        if (!cur) return cur;
        const n = (cur.gagal || 0) + 1;
        if (n >= ORTU_MAX_GAGAL) { cur.gagal = 0; cur.kunciSampai = Date.now() + ORTU_KUNCI_MENIT * 60000; }
        else { cur.gagal = n; }
        return cur;
      }).then(res => {
        const v = res.snapshot.val() || {};
        if (v.kunciSampai && v.kunciSampai > Date.now()) return { tampil: `PIN salah terlalu sering. Akun dikunci sampai pukul ${ortuTampilJam(v.kunciSampai)}.` };
        return { tampil: `PIN salah. Sisa percobaan: ${Math.max(0, ORTU_MAX_GAGAL - (v.gagal || 0))}.` };
      }).catch(() => ({ tampil: 'PIN salah.' }));
    }
    function loginPortalOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (typeof CryptoJS === 'undefined') { errEl.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman lalu coba lagi.'; return; }
      const waKey = ortuWaKey(ortuEl('portalOrtuNoWa').value);
      const pin = ortuEl('portalOrtuPin').value.trim();
      if (!waKey) { errEl.textContent = '⚠️ Nomor WhatsApp tidak valid.'; return; }
      if (!ortuPinValid(pin)) { errEl.textContent = '⚠️ PIN harus 6 angka.'; return; }
      portalOrtuBusy = true; errEl.textContent = '⏳ Memeriksa...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        const akun = snap.val();
        if (!akun || !akun.pin) throw { tampil: 'Belum ada PIN untuk nomor ini. Klik "Belum punya PIN? Buat PIN".' };
        if (akun.kunciSampai && akun.kunciSampai > Date.now()) throw { tampil: `Akun dikunci karena PIN salah terlalu sering. Coba lagi pukul ${ortuTampilJam(akun.kunciSampai)}, atau minta Admin mereset PIN.` };
        if (ortuHashPin(pin, waKey) !== akun.pin) return ortuCatatGagal(waKey).then(pesan => { throw pesan; });
        db.ref('ortu_akun/' + waKey).update({ gagal: 0, kunciSampai: null, terakhirLogin: new Date().toISOString() }).catch(() => {});
        return ortuCariAnak(waKey).then(anak => {
          if (!anak.length) throw { tampil: 'Nomor ini tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
          ortuIngatSetelahMasuk(waKey, pin, 'ortuIngatPerangkat');
          bukaDashboardPortalOrtu(waKey, anak);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function buatPinOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (typeof CryptoJS === 'undefined') { errEl.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman lalu coba lagi.'; return; }
      const waKey = ortuWaKey(ortuEl('portalOrtuNoWa').value);
      const pin1 = ortuEl('portalOrtuPinBaru').value.trim(), pin2 = ortuEl('portalOrtuPinBaru2').value.trim();
      if (!waKey) { errEl.textContent = '⚠️ Nomor WhatsApp tidak valid.'; return; }
      if (!ortuPinValid(pin1)) { errEl.textContent = '⚠️ PIN harus 6 angka.'; return; }
      if (ortuPinTerlaluMudah(pin1)) { errEl.textContent = '⚠️ PIN terlalu mudah ditebak (mis. 123456 / 111111). Pilih PIN lain.'; return; }
      if (pin1 !== pin2) { errEl.textContent = '⚠️ Ulangi PIN tidak sama.'; return; }
      portalOrtuBusy = true; errEl.textContent = '⏳ Memeriksa nomor...';
      ortuCariAnak(waKey).then(anak => {
        if (!anak.length) throw { tampil: 'Nomor WA ini belum terdaftar di data siswa. Hubungi wali kelas/Admin agar nomor Anda diisi di data siswa.' };
        const hash = ortuHashPin(pin1, waKey), sekarang = new Date().toISOString();
        return db.ref('ortu_akun/' + waKey).transaction(cur => cur ? undefined : { pin: hash, v: 1, dibuat: sekarang, terakhirLogin: sekarang }).then(res => {
          if (!res.committed) throw { tampil: 'PIN untuk nomor ini sudah pernah dibuat. Silakan masuk dengan PIN Anda. Lupa PIN? Hubungi Admin untuk reset.' };
          ortuIngatSetelahMasuk(waKey, pin1, 'ortuIngatPerangkatBuat');
          bukaDashboardPortalOrtu(waKey, anak);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    // ---------- Portal Orang Tua: "Masuk pertama kali" (PIN dibuatkan otomatis) + ingat perangkat ----------
    // PIN disimpan di localStorage perangkat orang tua (kunci simambaOrtuPerangkat) supaya buka portal berikutnya
    // langsung masuk. Disimpan apa adanya (bukan hash) karena harus dikirim lagi ke proses verifikasi. Dihapus saat
    // "Keluar", atau otomatis kalau PIN tersimpan sudah tidak cocok (diganti di perangkat lain / direset Admin).
    // Elemen UI-nya ada di index.html: #ortuIngatPerangkat, #ortuIngatPerangkatBuat, dan tombol masukPertamaKaliOrtu().
    const ORTU_PERANGKAT_KEY = 'simambaOrtuPerangkat';
    function ortuPerangkatBaca() {
      try {
        const o = JSON.parse(localStorage.getItem(ORTU_PERANGKAT_KEY) || 'null');
        return o && /^62[0-9]{8,13}$/.test(String(o.wa)) && ortuPinValid(String(o.pin)) ? { wa: String(o.wa), pin: String(o.pin), auto: !!o.auto } : null;
      } catch (e) { return null; }
    }
    function ortuPerangkatSimpan(wa, pin, auto) {
      try { localStorage.setItem(ORTU_PERANGKAT_KEY, JSON.stringify({ wa, pin, auto: !!auto, t: Date.now() })); return true; } catch (e) { return false; }
    }
    function ortuPerangkatLupa() { try { localStorage.removeItem(ORTU_PERANGKAT_KEY); } catch (e) {} }
    function ortuPenyimpananBisa() {
      try { localStorage.setItem('simambaOrtuTes', '1'); const ok = localStorage.getItem('simambaOrtuTes') === '1'; localStorage.removeItem('simambaOrtuTes'); return ok; } catch (e) { return false; }
    }
    function ortuIngatSetelahMasuk(wa, pin, idCek) {
      const cek = ortuEl(idCek);
      if (cek && !cek.checked) ortuPerangkatLupa(); else ortuPerangkatSimpan(wa, pin, false);
    }
    function ortuPinAcak() {
      for (let i = 0; i < 50; i++) {
        const a = new Uint32Array(1); crypto.getRandomValues(a);
        const pin = String(a[0] % 1000000).padStart(6, '0');
        if (!ortuPinTerlaluMudah(pin)) return pin;
      }
      throw { tampil: 'Gagal membuat PIN acak. Coba lagi.' };
    }
    function masukPertamaKaliOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (typeof CryptoJS === 'undefined') { errEl.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman lalu coba lagi.'; return; }
      const waKey = ortuWaKey(ortuEl('portalOrtuNoWa').value);
      if (!waKey) { errEl.textContent = '⚠️ Isi nomor WhatsApp yang valid dulu di kolom atas.'; return; }
      if (!ortuPenyimpananBisa()) { errEl.textContent = '⚠️ Browser ini tidak mengizinkan menyimpan PIN di perangkat (mode privat?). Pakai "Belum punya PIN? Buat PIN" supaya Anda memilih PIN sendiri.'; return; }
      portalOrtuBusy = true; errEl.textContent = '⏳ Memeriksa nomor...';
      let pin;
      ortuCariAnak(waKey).then(anak => {
        if (!anak.length) throw { tampil: 'Nomor WA ini belum terdaftar di data siswa. Hubungi wali kelas/Admin agar nomor Anda diisi di data siswa.' };
        pin = ortuPinAcak();
        const hash = ortuHashPin(pin, waKey), sekarang = new Date().toISOString();
        return db.ref('ortu_akun/' + waKey).transaction(cur => cur ? undefined : { pin: hash, v: 1, dibuat: sekarang, terakhirLogin: sekarang, otomatis: true }).then(res => {
          if (!res.committed) throw { tampil: 'Nomor ini sudah punya PIN. Silakan masuk dengan PIN Anda. Lupa PIN? Hubungi Admin untuk reset.' };
          const tersimpan = ortuPerangkatSimpan(waKey, pin, true);
          bukaDashboardPortalOrtu(waKey, anak);
          ortuTampilPinOtomatis(pin, tersimpan);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function ortuTampilPinOtomatis(pin, tersimpan) {
      const content = ortuEl('portalOrtuContent'); if (!content || !content.parentNode) return;
      let box = ortuEl('portalOrtuPinOtomatis');
      if (!box) { box = document.createElement('div'); box.id = 'portalOrtuPinOtomatis'; box.className = 'card'; box.style.cssText = 'margin-bottom:12px;border-left:4px solid #d97706;'; content.parentNode.insertBefore(box, content); }
      box.innerHTML = `<p style="font-weight:700;margin-bottom:6px;">🔑 PIN Anda dibuatkan otomatis</p>
        <p style="font-size:26px;font-weight:800;letter-spacing:6px;margin:4px 0 8px;">${escapeHtml(pin)}</p>
        <p style="font-size:12px;margin-bottom:8px;">${tersimpan
          ? '✅ Sudah tersimpan di perangkat ini, jadi lain kali portal terbuka otomatis. <strong>Catat PIN ini</strong> untuk masuk dari HP lain atau jika data browser terhapus. Bisa diganti lewat menu Ganti PIN.'
          : '⚠️ Perangkat ini gagal menyimpan PIN. <strong>Catat PIN ini sekarang</strong>; tanpa PIN ini Anda tidak bisa masuk lagi kecuali Admin mereset.'}</p>
        <button type="button" class="btn btn-soft" style="font-size:12px;padding:5px 12px;" onclick="this.parentNode.remove()">Sembunyikan</button>`;
    }
    // Dipanggil saat form login portal dibuka: kalau perangkat ini menyimpan PIN, langsung masuk.
    // Tidak memakai ortuCatatGagal: PIN tersimpan yang basi (diganti/direset) bukan percobaan tebak, jadi tidak menambah hitungan gagal.
    function ortuMasukOtomatis() {
      const p = ortuPerangkatBaca();
      if (!p || portalOrtuBusy || typeof CryptoJS === 'undefined') return;
      const errEl = ortuEl('portalOrtuError');
      ortuEl('portalOrtuNoWa').value = '0' + p.wa.slice(2);
      portalOrtuBusy = true; errEl.textContent = '⏳ Masuk otomatis...';
      db.ref('ortu_akun/' + p.wa).once('value').then(snap => {
        const akun = snap.val();
        const basi = { tampil: 'PIN yang tersimpan di perangkat ini sudah tidak berlaku (mungkin diganti atau direset Admin). Silakan masuk dengan PIN.' };
        if (!akun || !akun.pin) { ortuPerangkatLupa(); throw basi; }
        if (akun.kunciSampai && akun.kunciSampai > Date.now()) throw { tampil: `Akun dikunci karena PIN salah terlalu sering. Coba lagi pukul ${ortuTampilJam(akun.kunciSampai)}, atau minta Admin mereset PIN.` };
        if (ortuHashPin(p.pin, p.wa) !== akun.pin) { ortuPerangkatLupa(); throw basi; }
        db.ref('ortu_akun/' + p.wa).update({ gagal: 0, kunciSampai: null, terakhirLogin: new Date().toISOString() }).catch(() => {});
        return ortuCariAnak(p.wa).then(anak => {
          if (!anak.length) throw { tampil: 'Nomor ini tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
          bukaDashboardPortalOrtu(p.wa, anak);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function bukaDashboardPortalOrtu(waKey, anak) {
      portalOrtuWaKey = waKey; portalOrtuAnak = anak;
      ortuEl('portalOrtuError').textContent = '';
      ['portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      ortuEl('portalOrtuLogin').style.display = 'none';
      ortuEl('portalOrtuDashboard').style.display = 'block';
      ortuEl('portalOrtuGantiPin').style.display = 'none';
      const sel = ortuEl('portalOrtuAnakSelect');
      sel.innerHTML = anak.map(a => `<option value="${escapeHtml(a.key)}">${escapeHtml(a.name || '-')} — ${escapeHtml(a.kelas || '-')}</option>`).join('');
      ortuEl('portalOrtuAnakWrap').style.display = anak.length > 1 ? 'block' : 'none';
      renderPortalOrtuDashboard(anak[0]);
    }
    function pilihAnakPortalOrtu(key) {
      const a = portalOrtuAnak.find(x => x.key === key);
      if (a) renderPortalOrtuDashboard(a);
    }
    function toggleGantiPinOrtu() {
      const box = ortuEl('portalOrtuGantiPin');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
      ortuEl('portalOrtuGantiPinMsg').textContent = '';
      const tersimpan = ortuPerangkatBaca();   // PIN lama otomatis terisi dari perangkat (penting bila PIN-nya dibuatkan otomatis)
      if (box.style.display !== 'none' && tersimpan && tersimpan.wa === portalOrtuWaKey && !ortuEl('portalOrtuPinLama').value) ortuEl('portalOrtuPinLama').value = tersimpan.pin;
    }
    function gantiPinOrtu() {
      const msg = ortuEl('portalOrtuGantiPinMsg');
      if (portalOrtuBusy || !portalOrtuWaKey) return;
      const lama = ortuEl('portalOrtuPinLama').value.trim(), baru1 = ortuEl('portalOrtuPinGanti1').value.trim(), baru2 = ortuEl('portalOrtuPinGanti2').value.trim();
      msg.style.color = '#dc2626';
      if (!ortuPinValid(lama) || !ortuPinValid(baru1)) { msg.textContent = '⚠️ PIN harus 6 angka.'; return; }
      if (ortuPinTerlaluMudah(baru1)) { msg.textContent = '⚠️ PIN baru terlalu mudah ditebak. Pilih PIN lain.'; return; }
      if (baru1 !== baru2) { msg.textContent = '⚠️ Ulangi PIN baru tidak sama.'; return; }
      const waKey = portalOrtuWaKey;
      portalOrtuBusy = true; msg.textContent = '⏳ Menyimpan...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        const akun = snap.val();
        if (!akun || !akun.pin) throw { tampil: 'Akun tidak ditemukan (mungkin sudah direset Admin). Silakan masuk ulang.' };
        if (akun.kunciSampai && akun.kunciSampai > Date.now()) throw { tampil: `Akun dikunci sampai pukul ${ortuTampilJam(akun.kunciSampai)}.` };
        if (ortuHashPin(lama, waKey) !== akun.pin) return ortuCatatGagal(waKey).then(pesan => { throw pesan; });
        return db.ref('ortu_akun/' + waKey).update({ pin: ortuHashPin(baru1, waKey), diubah: new Date().toISOString(), gagal: 0, kunciSampai: null }).then(() => {
          msg.style.color = '#059669'; msg.textContent = '✅ PIN berhasil diganti.';
          const tersimpan = ortuPerangkatBaca();
          if (tersimpan && tersimpan.wa === waKey) ortuPerangkatSimpan(waKey, baru1, false);   // PIN pilihan sendiri: tidak lagi "otomatis"
          const infoPin = document.getElementById('portalOrtuPinOtomatis'); if (infoPin) infoPin.remove();
          ['portalOrtuPinLama', 'portalOrtuPinGanti1', 'portalOrtuPinGanti2'].forEach(id => { ortuEl(id).value = ''; });
        });
      }).catch(e => { msg.style.color = '#dc2626'; msg.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }

    // Ringkasan Infaq untuk Portal Orang Tua: status minggu ini + riwayat pembayaran + PERKIRAAN tunggakan.
    // Hanya memakai data yang sudah dimuat portal (iuran_siswa milik anak ini + kalender_akademik), jadi tidak
    // perlu Rules baru. Tunggakan = minggu tahun ajaran aktif (dari 1 Juli sampai minggu LALU) yang belum tercatat
    // lunas, di luar minggu yang seluruh hari sekolahnya (Sen-Sab) tercatat libur di kalender akademik.
    // Nominal tunggakan memakai nominal siswa saat ini, jadi sifatnya perkiraan.
    function portalOrtuInfaqHtml(siswa, iuran, kalenderSnap) {
      const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
      const tglPendek = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.getDate() + ' ' + bln[d.getMonth()] + ' ' + d.getFullYear() : '-'; };
      const nomSkrg = iuranNominalSiswa(siswa);               // null = standar belum diatur, 0 = gratis
      const gratis = nomSkrg === 0;
      const kini = new Date(), mingguIni = isoMingguKey(kini);
      const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || kini.getFullYear();
      const awalTA = new Date(thn, 6, 1);
      const lunasMap = {}; iuran.forEach(it => { if (it && it.minggu) lunasMap[it.minggu] = it; });
      const libur = [];
      kalenderSnap.forEach(c => { const k = c.val() || {}; if (k.jenis === 'libur' && k.tanggalMulai) libur.push([k.tanggalMulai, k.tanggalSelesai || k.tanggalMulai]); });
      const adaHariSekolah = key => {
        const { senin } = mingguKeTanggal(key);
        for (let i = 0; i < 6; i++) {                           // Senin..Sabtu
          const h = new Date(senin); h.setDate(senin.getDate() + i);
          if (h < awalTA || h > kini) continue;
          const t = tglLokal(h);
          if (!libur.some(r => t >= r[0] && t <= r[1])) return true;
        }
        return false;
      };
      const keys = [];
      const d = new Date(awalTA); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      while (d <= kini) { const k = isoMingguKey(d); if (keys.indexOf(k) < 0) keys.push(k); d.setDate(d.getDate() + 7); }
      const belum = gratis ? [] : keys.filter(k => k !== mingguIni && !lunasMap[k] && adaHariSekolah(k));
      const riwayat = Object.keys(lunasMap).sort().reverse().map(k => {
        const rec = lunasMap[k];
        const n = iuranAngka(rec.nominal);
        return { minggu: k, nominal: n !== null ? n : nomSkrg, estimasi: n === null, tgl: rec.inputAt };
      });
      const totalBayar = riwayat.reduce((a, r) => a + (r.nominal || 0), 0);
      const perkiraanTunggak = nomSkrg !== null && !gratis ? belum.length * nomSkrg : null;
      const statusIni = lunasMap[mingguIni]
        ? `<p style="color:#059669;font-weight:600;font-size:13px;">✅ Lunas${iuranAngka(lunasMap[mingguIni].nominal) !== null ? ' (' + iuranRp(iuranAngka(lunasMap[mingguIni].nominal)) + ')' : ''}</p>`
        : (gratis ? '<p class="text-muted" style="font-size:13px;">🆓 Ananda dibebaskan dari iuran infaq.</p>'
                  : '<p style="color:#dc2626;font-weight:600;font-size:13px;">⏳ Belum tercatat lunas minggu ini</p>');
      const kotak = (angka, label, warna) => `<div><div style="font-size:18px;font-weight:800;color:${warna};">${angka}</div><div class="text-muted" style="font-size:11px;">${label}</div></div>`;
      const ringkas = gratis ? '' : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;margin:10px 0;">
          ${kotak(riwayat.length + ' mgg', 'Sudah lunas', '#059669')}
          ${kotak(iuranRp(totalBayar), 'Total dibayar', '#2563eb')}
          ${kotak(belum.length + ' mgg', 'Belum tercatat', belum.length ? '#dc2626' : '#059669')}
        </div>`;
      const barisRiwayat = riwayat.map(r => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
          <span>✅ ${escapeHtml(mingguLabel(r.minggu))}<span class="text-muted" style="font-size:11px;"> · dicatat ${escapeHtml(tglPendek(r.tgl))}</span></span>
          <span style="font-weight:600;white-space:nowrap;">${r.nominal === null ? '—' : (r.estimasi ? '~' : '') + escapeHtml(iuranRp(r.nominal))}</span></div>`).join('');
      const barisBelum = belum.slice().reverse().map(k => `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">⏳ ${escapeHtml(mingguLabel(k))}</div>`).join('');
      const blokTunggak = gratis ? '' : (belum.length
        ? `<details style="margin-top:6px;" ${belum.length <= 4 ? 'open' : ''}><summary style="cursor:pointer;font-size:13px;font-weight:600;color:#dc2626;">⚠️ ${belum.length} minggu belum tercatat${perkiraanTunggak !== null ? ' · perkiraan ' + escapeHtml(iuranRp(perkiraanTunggak)) : ''}</summary>${barisBelum}</details>`
        : '<p style="font-size:13px;color:#059669;font-weight:600;margin-top:6px;">🎉 Tidak ada tunggakan tercatat.</p>');
      const blokRiwayat = riwayat.length
        ? `<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:13px;font-weight:600;">📜 Riwayat pembayaran (${riwayat.length})</summary><div style="max-height:260px;overflow-y:auto;">${barisRiwayat}</div></details>`
        : '<p class="text-muted" style="font-size:13px;margin-top:6px;">Belum ada pembayaran tercatat di tahun ajaran ini.</p>';
      return `<div class="card" style="margin-bottom:12px;">
          <p style="font-weight:700;margin-bottom:8px;">💵 Infaq · TA ${escapeHtml(currentTahunAjaran)}</p>
          ${statusIni}${ringkas}${blokTunggak}${blokRiwayat}
          <p class="text-muted" style="font-size:11px;margin-top:8px;">Berdasarkan catatan petugas infaq kelas. Minggu libur pada kalender akademik dan minggu berjalan tidak dihitung; nominal tunggakan adalah perkiraan. Bila ada selisih dengan catatan Bapak/Ibu, mohon hubungi wali kelas.</p>
        </div>`;
    }
    function renderPortalOrtuDashboard(siswa) {
      const content = document.getElementById('portalOrtuContent');
      content.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">⏳ Memuat data...</p>';
      const now = new Date();
      const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
      Promise.all([
        db.ref('grades').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('kedisiplinan_siswa').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('iuran_siswa').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('buku_penghubung').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        // Hanya absensi BULAN INI (dulu seluruh riwayat kelas, semua tahun). Filter kelas dilakukan di bawah.
        db.ref('attendance').orderByChild('tanggal').startAt(monthStr + '-01').endAt(monthStr + '-31').once('value'),
        db.ref('materi_belajar').orderByChild('kelas').equalTo(siswa.kelas).once('value'),
        db.ref('tugas').orderByChild('kelas').equalTo(siswa.kelas).once('value'),
        db.ref('tugas_submission').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        // Hanya jurnal HARI INI (dulu seluruh riwayat jurnal kelas). Filter kelas dilakukan di bawah.
        db.ref('journal').orderByChild('tanggal').equalTo(tglLokal()).once('value'),
        db.ref('kalender_akademik').once('value'),
        db.ref('events').once('value'),
        db.ref('ujian').once('value')
      ]).then(([gradesSnap, sikapSnap, iuranSnap, bukuSnap, absenSnap, materiSnap, tugasSnap, submissionSnap, journalSnap, kalenderSnap, eventsSnap, ujianSnap]) => {
        // Semua query di atas cuma bisa orderByChild SATU field di Firebase RTDB (siswaKey/kelas),
        // jadi filter tahunAjaran-nya WAJIB ditambahkan manual di sini -- tanpa ini, portal ortu
        // menampilkan data dari SEMUA tahun ajaran tergabung jadi satu (nilai rapor tahun lalu
        // ikut nongol di tabel Nilai, poin pelanggaran/prestasi terus terakumulasi tanpa pernah
        // "reset" tiap tahun ajaran baru, dan daftar Tugas berisi tugas dari kelas yang sama di
        // tahun-tahun sebelumnya yang sudah tidak relevan lagi buat siswa sekarang).
        // FIX: dulu `!x.tahunAjaran ||` membuat data lama (sebelum field tahunAjaran ada) SELALU
        // lolos filter dan nongol lagi di tahun ajaran manapun yang sedang aktif -- bukan cuma di
        // tahun ajaran waktu data itu sebenarnya dibuat. Sekarang data lama dicocokkan ke tahun
        // ajaran yang dihitung dari tanggalnya sendiri (lihat sesuaiTahunAjaranTermasukDataLama).
        const sesuaiTahunAjaran = sesuaiTahunAjaranTermasukDataLama;
        const grades = []; gradesSnap.forEach(c => { const g = c.val(); if (sesuaiTahunAjaran(g)) grades.push(g); });
        const sikap = []; sikapSnap.forEach(c => { const d = c.val(); if (sesuaiTahunAjaran(d)) sikap.push(d); });
        const iuran = []; iuranSnap.forEach(c => { const it = c.val(); if (sesuaiTahunAjaran(it)) iuran.push(it); });
        const buku = []; bukuSnap.forEach(c => { const b = c.val(); if (sesuaiTahunAjaran(b)) buku.push(b); });
        const materi = []; materiSnap.forEach(c => { const m = c.val(); if (sesuaiTahunAjaran(m)) materi.push(m); });
        const tugasList = []; tugasSnap.forEach(c => { const t = c.val(); if (sesuaiTahunAjaran(t)) tugasList.push({ key: c.key, ...t }); });
        const submissionMap = {}; submissionSnap.forEach(c => { const s = c.val(); if (sesuaiTahunAjaran(s)) submissionMap[s.tugasKey] = s; });
        // Hasil Belajar Hari Ini -- jurnal mengajar (per jam pelajaran) untuk kelas anak,
        // difilter tanggal HARI INI saja & status 'approved' (jurnal susulan yang masih
        // menunggu approval Admin sengaja tidak ditampilkan dulu ke orang tua, supaya yang
        // tampil hanya yang sudah dikonfirmasi benar-benar terjadi sesuai jamnya).
        const todayStrJurnal = tglLokal();
        const journalHariIni = [];
        journalSnap.forEach(c => { const j = c.val(); if (j.kelas === siswa.kelas && j.tanggal === todayStrJurnal && j.status === 'approved' && sesuaiTahunAjaran(j)) journalHariIni.push(j); });
        journalHariIni.sort((a,b) => (a.jam_ke||0) - (b.jam_ke||0));
        const journalRows = journalHariIni.map(j => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <div class="text-muted" style="font-size:11px;">Jam ke-${j.jam_ke} — ${escapeHtml(j.subject||'-')}</div>
          <div style="font-size:13px;margin-top:2px;">${escapeHtml(j.activity||'-')}</div>
          <div class="text-muted" style="font-size:11px;margin-top:2px;">Oleh: ${escapeHtml(j.guru||'-')}</div>
        </div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada jurnal pelajaran tercatat untuk hari ini.</p>';
        // Agenda terdekat -- gabungan 3 sumber sama seperti Kalender Akademik di menu staf
        // (kalender_akademik manual + Acara + Ujian), tapi cuma yang tanggalnya HARI INI atau
        // setelahnya, diurutkan, dibatasi 8 item -- supaya orang tua lihat yang relevan ke depan,
        // bukan riwayat lama.
        const todayStr0 = tglLokal();
        const iconJenisAgenda = { libur: '🔴', ujian: '🟣', acara: '🟠', akademik: '🟢' };
        let agendaList = [];
        kalenderSnap.forEach(c => { const k = c.val(); const mulai = k.tanggalMulai, selesai = k.tanggalSelesai || k.tanggalMulai; if (selesai >= todayStr0) agendaList.push({ jenis: k.jenis, judul: k.judul, tanggal: mulai, keterangan: k.keterangan }); });
        eventsSnap.forEach(c => { const e = c.val(); if (e.tanggal >= todayStr0) agendaList.push({ jenis: 'acara', judul: e.nama, tanggal: e.tanggal, keterangan: e.jenis }); });
        ujianSnap.forEach(c => { const u = c.val(); if (u.tanggal >= todayStr0) agendaList.push({ jenis: 'ujian', judul: u.nama, tanggal: u.tanggal, keterangan: u.jenis }); });
        agendaList.sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
        agendaList = agendaList.slice(0, 8);
        const agendaRows = agendaList.map(a => `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">${iconJenisAgenda[a.jenis]||'📌'} <strong>${escapeHtml(a.judul)}</strong> <span class="text-muted" style="font-size:11px;">— ${escapeHtml(a.tanggal)}${a.keterangan ? ' — ' + escapeHtml(a.keterangan) : ''}</span></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada agenda mendatang.</p>';
        let hadir=0, sakit=0, izin=0, alfa=0;
        absenSnap.forEach(c => {
          const rec = c.val();
          if (rec.kelas === siswa.kelas && rec.tanggal && rec.tanggal.startsWith(monthStr) && rec.data && rec.data[siswa.key] && sesuaiTahunAjaran(rec)) {
            const st = rec.data[siswa.key];
            if (st === 'H') hadir++; else if (st === 'S') sakit++; else if (st === 'I') izin++; else if (st === 'A') alfa++;
          }
        });
        const nilaiRows = grades.map(g => `<tr><td>${escapeHtml(g.subject||'-')}</td><td>${escapeHtml(g.semester||'-')}</td><td style="text-align:right;font-weight:700;">${calculateRapor(g.data||{})}</td></tr>`).join('');
        const totalPelanggaran = sikap.filter(d=>d.jenis==='pelanggaran').reduce((s,d)=>s+(d.poin||0),0);
        const totalPrestasi = sikap.filter(d=>d.jenis==='prestasi').reduce((s,d)=>s+(d.poin||0),0);
        const netSikap = totalPrestasi - totalPelanggaran;
        const sikapRows = [...sikap].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(d => `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span style="color:${d.jenis==='prestasi'?'#059669':'#dc2626'};font-weight:600;">${d.jenis==='prestasi'?'🌟':'⚠️'} ${escapeHtml(d.kategori||'-')}</span> <span class="text-muted">(${d.poin||0} poin) — ${escapeHtml(d.tanggal||'-')}</span></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan.</p>';
        const iuranMingguIni = iuran.find(it => it.minggu === isoMingguKey());
        const infaqCardHtml = portalOrtuInfaqHtml(siswa, iuran, kalenderSnap);
        const bukuRows = [...buku].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(b => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div class="text-muted" style="font-size:12px;">${escapeHtml(b.tanggal||'-')}</div><div style="font-size:13px;">${escapeHtml(b.catatan||'-')}</div></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan dari guru.</p>';
        const materiRows = [...materi].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(m => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div style="font-size:13px;font-weight:600;">${escapeHtml(m.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(m.mapel||'-')} — ${escapeHtml(m.tanggal||'-')}</span></div><div class="text-muted" style="font-size:12px;margin-top:2px;">${escapeHtml(m.isi)}</div>${m.link ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;">🔗 Buka Link</a>` : ''}</div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada materi dibagikan.</p>';
        const tugasRows = [...tugasList].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).map(t => {
          const sub = submissionMap[t.key];
          if (sub) {
            return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:13px;font-weight:600;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
              <div style="font-size:11px;color:#059669;font-weight:600;margin-top:2px;">✅ Sudah dikumpulkan (${escapeHtml((sub.waktuKumpul||'').slice(0,16).replace('T',' '))})</div>
            </div>`;
          }
          return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:13px;font-weight:600;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;margin:4px 0;">${escapeHtml(t.deskripsi)}</div>
            <div style="font-size:11px;color:#d97706;margin-bottom:6px;">⏳ Belum dikumpulkan${t.deadline ? ' — batas waktu: ' + escapeHtml(t.deadline) : ''}</div>
            <textarea id="jawabanTeks_${t.key}" class="field" rows="2" placeholder="Tulis jawaban di sini (opsional kalau cuma kirim foto)..." style="margin-bottom:6px;"></textarea>
            <input id="jawabanFoto_${t.key}" type="file" accept="image/*" style="font-size:12px;margin-bottom:6px;">
            <button class="btn btn-success" style="font-size:12px;padding:6px 12px;" onclick="kumpulTugasOrtu('${t.key}','${siswa.key}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kumpulkan Tugas</button>
          </div>`;
        }).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada tugas untuk kelas ini.</p>';
        content.innerHTML = `
          <div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:12px;">
            <img src="logo/logo-lembaga.png" alt="Logo ${escapeHtml(MADRASAH.nama || 'madrasah')}" width="44" height="44" style="width:44px;height:44px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">
            <div style="min-width:0;">
              <p class="text-muted" style="font-size:11px;margin:0;">${escapeHtml(MADRASAH.nama || '')}</p>
              <p style="font-size:16px;font-weight:700;margin:0;">${escapeHtml(siswa.name)}</p>
              <p class="text-muted" style="font-size:13px;margin:0;">Kelas ${escapeHtml(siswa.kelas)}</p>
            </div>
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📅 Kehadiran Bulan Ini</p>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
              <div><div style="font-size:20px;font-weight:800;color:#059669;">${hadir}</div><div class="text-muted" style="font-size:11px;">Hadir</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#d97706;">${sakit}</div><div class="text-muted" style="font-size:11px;">Sakit</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#2563eb;">${izin}</div><div class="text-muted" style="font-size:11px;">Izin</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#dc2626;">${alfa}</div><div class="text-muted" style="font-size:11px;">Alfa</div></div>
            </div>
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📆 Agenda Terdekat</p>
            ${agendaRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📘 Hasil Belajar Hari Ini</p>
            ${journalRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📚 Materi Belajar Terbaru</p>
            ${materiRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📝 Tugas</p>
            ${tugasRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📝 Nilai Terakhir</p>
            ${grades.length ? `<div style="overflow-x:auto;"><table><thead><tr><th>Mapel</th><th>Semester</th><th>Nilai</th></tr></thead><tbody>${nilaiRows}</tbody></table></div>` : '<p class="text-muted" style="font-size:13px;">Belum ada nilai tercatat.</p>'}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">🌟 Sikap &amp; Kedisiplinan</p>
            <p style="font-size:13px;margin-bottom:6px;">Net Poin: <strong style="color:${netSikap>=0?'#059669':'#dc2626'};">${netSikap>=0?'+':''}${netSikap}</strong> (⚠️ ${totalPelanggaran} / 🌟 ${totalPrestasi})</p>
            ${sikapRows}
          </div>
          ${infaqCardHtml}
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📖 Buku Penghubung Terbaru</p>
            ${bukuRows}
          </div>
          <div class="card">
            <p style="font-weight:700;margin-bottom:8px;">💬 Saran &amp; Kritik untuk Madrasah</p>
            <p class="text-muted" style="font-size:12px;margin-bottom:8px;">Masukan Bapak/Ibu membantu madrasah menjadi lebih baik. Bisa dikirim dengan nama, atau anonim kalau memang lebih nyaman.</p>
            <textarea id="saranKritikTeks" class="field" rows="3" placeholder="Tulis saran atau kritik di sini..."></textarea>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:8px 0;cursor:pointer;">
              <input type="checkbox" id="saranKritikAnonim"> Kirim sebagai anonim (nama &amp; kelas tidak disertakan)
            </label>
            <button class="btn btn-primary" id="btnKirimSaranKritik" style="font-size:12px;padding:7px 14px;" onclick="kirimSaranKritik('${siswa.key}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kirim ke Madrasah</button>
            <div id="saranKritikStatus" style="margin-top:8px;font-size:12px;"></div>
          </div>
        `;
        try { if (typeof bsOrtuRender === 'function') bsOrtuRender(siswa); } catch (e) { console.warn('[SI MAMBA] Bacaan Shalat (Portal Ortu) gagal dirender:', e); }
      }).catch(err => { content.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;">Gagal memuat data: ${err.message}</p>`; });
    }
    // Saran & Kritik dari Portal Orang Tua -- disimpan terpisah dari data siswa lain (tidak ikut
    // di-load lagi ke portal setelah kirim, sekali kirim langsung selesai) supaya orang tua tidak
    // bisa lihat balik kiriman orang lain. Opsi anonim: siswaKey/siswaNama/kelas cuma diisi kalau
    // TIDAK anonim -- kalau anonim, field itu sengaja null (Admin tidak akan tahu identitasnya).
    function kirimSaranKritik(siswaKey, siswaNama, kelas) {
      if (isBusy('kirimSaranKritik')) return;
      const teks = document.getElementById('saranKritikTeks').value.trim();
      const anonim = document.getElementById('saranKritikAnonim').checked;
      const statusEl = document.getElementById('saranKritikStatus');
      if (!teks) { statusEl.innerHTML = '<span style="color:#dc2626;">⚠️ Tulis dulu saran/kritiknya.</span>'; return; }
      statusEl.innerHTML = '<span class="text-muted">⏳ Mengirim...</span>';
      const btnKirimSaran = document.getElementById('btnKirimSaranKritik');
      setBusy('kirimSaranKritik', btnKirimSaran);
      const ref = db.ref('saran_kritik').push();
      ref.set({
        pesan: teks,
        anonim,
        siswaKey: anonim ? null : siswaKey,
        siswaNama: anonim ? null : siswaNama,
        kelas: anonim ? null : kelas,
        waktuKirim: new Date().toISOString(),
        status: 'baru'
      }, err => {
        clearBusy('kirimSaranKritik', btnKirimSaran);
        if (err) { statusEl.innerHTML = `<span style="color:#dc2626;">❌ Gagal mengirim: ${err.message}</span>`; return; }
        statusEl.innerHTML = '<span style="color:#059669;font-weight:600;">✅ Terkirim, terima kasih atas masukannya!</span>';
        document.getElementById('saranKritikTeks').value = '';
        document.getElementById('saranKritikAnonim').checked = false;
      });
    }
    // Kumpul tugas dari Portal Orang Tua -- foto (kalau diisi) diperkecil dulu (maks 640px sisi
    // terpanjang, JPEG q0.5) sebelum disimpan sebagai data URL, sama seperti pola foto check-in
    // acara/ujian, supaya tidak membengkak di database. Key deterministik (tugasKey_siswaKey)
    // supaya kumpul ulang otomatis MENGGANTIKAN jawaban sebelumnya (bukan menumpuk).
    function kumpulTugasOrtu(tugasKey, siswaKey, siswaNama, kelas) {
      const jawabanTeks = (document.getElementById('jawabanTeks_'+tugasKey).value || '').trim();
      const fileInput = document.getElementById('jawabanFoto_'+tugasKey);
      const file = fileInput.files && fileInput.files[0];
      if (!jawabanTeks && !file) { toast('⚠️ Isi jawaban teks atau lampirkan foto dulu.', true); return; }
      const simpanKumpul = (fotoDataUrl) => {
        const ref = db.ref(`tugas_submission/${tugasKey}_${siswaKey}`);
        ref.set({ tugasKey, siswaKey, siswaNama, kelas, jawabanTeks: jawabanTeks || null, hasFoto: !!fotoDataUrl, waktuKumpul: new Date().toISOString(), tahunAjaran: currentTahunAjaran }, err => {
          if (err) { toast('❌ Gagal mengumpulkan: ' + err.message, true); return; }
          simpanFotoTerpisah('tugas_submission', tugasKey + '_' + siswaKey, fotoDataUrl); // set / hapus foto (kumpul ulang tanpa foto = foto lama dihapus)
          toast('✅ Tugas berhasil dikumpulkan!');
          const siswa = { key: siswaKey, name: siswaNama, kelas };
          renderPortalOrtuDashboard(siswa);
        });
      };
      if (!file) { simpanKumpul(null); return; }
      if (!/^image\//.test(file.type)) { toast('⚠️ File harus berupa gambar!', true); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const maxSisi = 640;
          const skala = Math.min(1, maxSisi / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * skala); canvas.height = Math.round(img.naturalHeight * skala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          simpanKumpul(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = () => toast('Gagal memproses foto.', true);
        img.src = e.target.result;
      };
      reader.onerror = () => toast('Gagal membaca file.', true);
      reader.readAsDataURL(file);
    }
