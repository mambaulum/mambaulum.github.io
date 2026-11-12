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
    // PIN pertama hanya boleh dibuat oleh orang tua yang SUDAH masuk lewat link WhatsApp dari madrasah (link membuktikan
    // bahwa nomor itu milik penerimanya). Sebelumnya cukup mengetik nomor WA, sehingga siapa pun yang tahu nomor orang tua
    // bisa mendaftar lebih dulu. JANGAN ubah ke false: Rules Tahap B menolak pembuatan PIN tanpa sesi link, jadi buatPinOrtu/masukPertamaKaliOrtu tidak akan jalan.
    const ORTU_BUAT_PIN_BUTUH_LINK = true;
    const ORTU_PESAN_BUTUH_LINK = 'Untuk keamanan, minta link masuk dari wali kelas/Admin lewat WhatsApp. Setelah masuk, Anda bisa membuat PIN sendiri.';
    let portalOrtuWaKey = null, portalOrtuAnak = [], portalOrtuBusy = false;
    // Catat terakhirLogin paling sering sekali per 6 jam per perangkat (masuk otomatis terjadi tiap aplikasi dibuka);
    // dulu ditulis setiap buka. Penandanya disimpan lokal karena isi ortu_akun tidak terbaca klien lagi.
    function ortuCatatLoginAkun(waKey) {
      const kunci = 'simambaOrtuLoginTs_' + waKey;
      try {
        if (Date.now() - (+localStorage.getItem(kunci) || 0) < 6 * 3600000) return;
        localStorage.setItem(kunci, String(Date.now()));
      } catch (e) {}
      db.ref('ortu_akun/' + waKey).update({ gagal: null, kunciSampai: null, terakhirLogin: new Date().toISOString() }).catch(() => {});
    }
    function ortuPinValid(pin) { return /^[0-9]{6}$/.test(pin); }
    function ortuPinTerlaluMudah(pin) { return /^(\d)\1{5}$/.test(pin) || '01234567890123456789'.includes(pin) || '98765432109876543210'.includes(pin); }
    // PBKDF2 (bukan SHA-256 polos) supaya menebak PIN 6 angka dari hash yang bocor jauh lebih lambat.
    function ortuHashPin(pin, waKey) {
      return CryptoJS.PBKDF2(String(pin), 'simamba-ortu::' + waKey, { keySize: 256 / 32, iterations: ORTU_PIN_ITER, hasher: CryptoJS.algo.SHA256 }).toString(CryptoJS.enc.Hex);
    }
    // ---------- Sesi orang tua: ortu_sesi/<uid> ----------
    // Hash PIN di ortu_akun TIDAK PERNAH dibaca klien. Untuk masuk, klien menulis bukti ke ortu_sesi/<uid>:
    //   { wa, h }  h = hash PIN        -> Rules mencocokkan dengan ortu_akun/<wa>/pin
    //   { wa, l }  l = hash token link -> Rules memeriksa ortu_link/<wa>/<l> ada dan belum dicabut
    // Bukti salah = PERMISSION_DENIED. PIN direset / link dicabut Admin -> bukti tidak lagi cocok.
    // PENTING: Rules Tahap A (node ortu_sesi) harus sudah dipublish SEBELUM file ini dirilis.
    function ortuAuthObj() {
      try { if (typeof firebase !== 'undefined' && firebase.auth) return firebase.auth(); } catch (e) {}
      try { if (typeof auth !== 'undefined' && auth && typeof auth === 'object') return auth; } catch (e) {}
      return null;
    }
    function ortuUid() {
      const tunggu = (typeof authReady !== 'undefined' && authReady && typeof authReady.then === 'function') ? authReady.catch(() => {}) : Promise.resolve();
      return tunggu.then(() => new Promise((ok, gagal) => {
        let n = 0;
        const cek = () => {
          const a = ortuAuthObj(), u = a && a.currentUser;
          if (u && u.uid) return ok(u.uid);
          if (++n > 40) return gagal({ tampil: 'Koneksi belum siap. Muat ulang halaman lalu coba lagi.' });
          setTimeout(cek, 150);
        };
        cek();
      }));
    }
    function ortuDitolak(e) { return !!e && (e.code === 'PERMISSION_DENIED' || /permission_denied/i.test(String(e.message || e))); }
    function ortuBukaSesi(waKey, bukti) {
      const tulis = () => ortuUid().then(uid => db.ref('ortu_sesi/' + uid).set(Object.assign({ wa: waKey }, bukti)));
      // PERMISSION_DENIED membuat link/PIN tersimpan DIHAPUS dari perangkat. Ditolak sekali bisa karena token login anonim belum
      // terpasang, jadi diulang satu kali sebelum dianggap bukti salah. Seluruhnya dibatasi 15 dtk (lihat ortuBatasWaktu).
      return ortuBatasWaktu(tulis().catch(e => {
        if (!ortuDitolak(e)) throw e;
        return new Promise(r => setTimeout(r, 1200)).then(tulis);
      }), 15000);
    }
    function ortuTutupSesi() { return ortuUid().then(uid => db.ref('ortu_sesi/' + uid).remove()).catch(() => {}); }
    function ortuTampilJam(ms) { return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
    function ortuPesanError(e) { return '❌ ' + ((e && e.tampil) || ('Gagal: ' + ((e && e.message) || e))); }
    // Tulis ke Firebase saat sinyal putus bisa menggantung tanpa akhir, dan portalOrtuBusy menahan semua tombol login selama itu.
    // Pembungkus ini menyerah setelah 15 dtk dengan galat BIASA (bukan PERMISSION_DENIED), jadi link/PIN tersimpan di perangkat TIDAK dihapus.
    function ortuBatasWaktu(p, ms) {
      return new Promise((ok, gagal) => {
        const t = setTimeout(() => gagal({ tampil: 'Koneksi lambat atau terputus. Periksa internet Anda lalu coba lagi.' }), ms || 15000);
        Promise.resolve(p).then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); gagal(e); });
      });
    }
    function bukaPortalOrtuForm() {
      document.getElementById('loginChooser').style.display = 'none';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('portalOrtuLogin').style.display = 'flex';
      document.getElementById('portalOrtuDashboard').style.display = 'none';
      ['portalOrtuNoWa', 'portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      tampilFormBuatPinOrtu(false);
      ortuTerapkanModeLink();
      ortuMasukOtomatis();
    }
    function ortuTerapkanModeLink() {
      ['portalOrtuBlokPertama', 'portalOrtuBlokBuatPin'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = ORTU_BUAT_PIN_BUTUH_LINK ? 'none' : ''; });
      const i = document.getElementById('portalOrtuInfoButuhLink'); if (i) i.style.display = ORTU_BUAT_PIN_BUTUH_LINK ? 'block' : 'none';
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
      if (ortuLinkBaca() && !confirm('Jika keluar, Anda perlu membuka kembali link dari WhatsApp untuk masuk lagi.\n\nTetap keluar?')) return;
      ortuTutupSesi(); ortuPerangkatLupa(); ortuLinkLupa();
      const infoPin = document.getElementById('portalOrtuPinOtomatis'); if (infoPin) infoPin.remove();
      const kartuBuatPin = document.getElementById('portalOrtuBuatPinLink'); if (kartuBuatPin) kartuBuatPin.remove();
      portalOrtuWaKey = null; portalOrtuAnak = [];
      Object.keys(_ortuCacheBersama).forEach(k => { delete _ortuCacheBersama[k]; });
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
    // Pemindaian penuh node siswa juga dibatasi 3x per hari per perangkat (salah ketik nomor berulang / muat ulang halaman
    // tidak lagi mengunduh seluruh siswa tiap kali).
    function ortuFallbackBoleh() {
      try {
        const hari = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem('simambaOrtuFallback') || 'null');
        return !(o && o.d === hari && o.n >= 3);
      } catch (e) { return true; }
    }
    function ortuFallbackCatat() {
      try {
        const hari = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem('simambaOrtuFallback') || 'null');
        localStorage.setItem('simambaOrtuFallback', JSON.stringify({ d: hari, n: (o && o.d === hari ? o.n : 0) + 1 }));
      } catch (e) {}
    }
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
        if (hasil.length || _ortuFallbackDipakai || !ortuFallbackBoleh()) return hasil;
        _ortuFallbackDipakai = true; ortuFallbackCatat();
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
    // Catat 1x salah PIN ke riwayat login. Penguncian akun (gagal/kunciSampai di ortu_akun) DIHAPUS: Rules tidak bisa
    // mencatat percobaan yang ditolak, jadi kunci itu hanya hiasan dan bisa dilewati dengan membaca hash langsung.
    // Pengaman yang berlaku: hash tidak lagi terbaca klien, App Check, dan link WhatsApp sebagai jalur utama.
    function ortuCatatGagal(waKey) {
      ortuCatatRiwayatLogin(waKey, 'pin', 'gagal', null, 'PIN salah');
      return Promise.resolve({ tampil: 'PIN salah, atau nomor ini belum punya PIN. Minta link masuk ke wali kelas/Admin bila perlu.' });
    }
    // ---------- Riwayat login orang tua -> node ortu_login_log (dibaca Admin: js/riwayat-login-ortu.js) ----------
    // Dicatat: login berhasil (cara: pin / pertama / otomatis / link) dan PIN salah (termasuk yang memicu kunci akun).
    // Tidak menyimpan PIN. Gagal menulis TIDAK mengganggu login (semua dibungkus try/catch).
    // Nomor build aplikasi Portal Ortu. Ditulis ke tiap catatan login (field versi) supaya Admin bisa memantau wali yang sudah
    // memakai versi terbaru (kartu Riwayat Login Orang Tua > Pembaruan Aplikasi Wali). NAIKKAN angka ini tiap rilis berikutnya.
    const ORTU_BUILD = 378, ORTU_VERSI = 'v8.' + ORTU_BUILD;
    function ortuPerangkatRingkas() {
      const ua = navigator.userAgent || '';
      if (/Android/i.test(ua)) return 'Android';
      if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone/iPad';
      if (/Windows/i.test(ua)) return 'Windows';
      if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
      if (/Linux/i.test(ua)) return 'Linux';
      return 'Lainnya';
    }
    function ortuCatatRiwayatLogin(waKey, cara, hasil, anak, detail) {
      try {
        if (!waKey || typeof db === 'undefined') return;
        if (cara === 'otomatis' && hasil === 'berhasil') {   // masuk otomatis terjadi tiap aplikasi dibuka: catat paling sering 1x/30 menit per nomor di perangkat ini
          const kunci = 'simambaOrtuLogTs_' + waKey, kv = 'simambaOrtuLogVer_' + waKey, now = Date.now();
          // Versi baru pertama kali dibuka di perangkat ini selalu dicatat (tanpa menunggu 30 menit), agar langsung terpantau.
          try { if (localStorage.getItem(kv) === ORTU_VERSI && now - (+localStorage.getItem(kunci) || 0) < 30 * 60000) return; localStorage.setItem(kunci, String(now)); localStorage.setItem(kv, ORTU_VERSI); } catch (e) {}
        }
        const daftar = Array.isArray(anak) ? anak : [];
        const entri = { wa: String(waKey), cara: String(cara), hasil: String(hasil), perangkat: ortuPerangkatRingkas(), versi: ORTU_VERSI, waktu: new Date().toISOString() };
        const nama = daftar.map(a => a && a.name).filter(Boolean).join(', ').slice(0, 120);
        const kelas = Array.from(new Set(daftar.map(a => a && a.kelas).filter(Boolean))).join(', ').slice(0, 40);
        if (nama) entri.anak = nama;
        if (kelas) entri.kelas = kelas;
        if (detail) entri.detail = String(detail).slice(0, 80);
        db.ref('ortu_login_log').push().set(entri, err => { if (err) console.warn('[SI MAMBA] Riwayat login ortu gagal disimpan (tidak fatal):', err.message || err); });
      } catch (e) { console.warn('[SI MAMBA] Riwayat login ortu gagal (tidak fatal):', e); }
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
      ortuBukaSesi(waKey, { h: ortuHashPin(pin, waKey) })
        .catch(e => { if (ortuDitolak(e)) return ortuCatatGagal(waKey).then(pesan => { throw pesan; }); throw e; })
        .then(() => {
          ortuCatatLoginAkun(waKey);
          return ortuCariAnak(waKey).then(anak => {
            if (!anak.length) throw { tampil: 'Nomor ini tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
            ortuIngatSetelahMasuk(waKey, pin, 'ortuIngatPerangkat');
            bukaDashboardPortalOrtu(waKey, anak, 'pin');
          });
        }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function buatPinOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (ORTU_BUAT_PIN_BUTUH_LINK) { errEl.textContent = '⚠️ ' + ORTU_PESAN_BUTUH_LINK; return; }
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
          bukaDashboardPortalOrtu(waKey, anak, 'pertama');
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
    // ---------- Link masuk lewat WhatsApp (tanpa PIN) ----------
    // Admin/wali kelas membuat link pribadi per nomor WA (js/link-ortu.js) lalu mengirimnya lewat WhatsApp:
    //   https://.../?app=ortu#masuk=<noWA 62...>.<token 32 hex>
    // Di server hanya disimpan HASH token: ortu_link/<noWA>/<sha256(token)> = { dibuat }. Token acak 128 bit
    // (tidak bisa ditebak), jadi tidak perlu PIN. Perangkat yang sudah membuka link mengingat token-nya
    // (localStorage 'simambaOrtuLink') sehingga berikutnya langsung masuk. Token ditaruh di #hash supaya
    // tidak ikut terkirim ke server. Admin mencabut link (hapus ortu_link/<noWA>) -> perangkat dilupakan
    // otomatis saat portal dibuka berikutnya. Login lewat link TIDAK menyentuh ortu_akun (PIN tetap berjalan sendiri).
    const ORTU_LINK_KEY = 'simambaOrtuLink';
    function ortuLinkHash(token) { return CryptoJS.SHA256(String(token)).toString(CryptoJS.enc.Hex); }
    function ortuLinkBaca() {
      try {
        const o = JSON.parse(localStorage.getItem(ORTU_LINK_KEY) || 'null');
        return o && /^62[0-9]{8,13}$/.test(String(o.wa)) && /^[0-9a-f]{32}$/.test(String(o.tok)) ? { wa: String(o.wa), tok: String(o.tok) } : null;
      } catch (e) { return null; }
    }
    function ortuLinkSimpan(wa, tok) { try { localStorage.setItem(ORTU_LINK_KEY, JSON.stringify({ wa, tok, t: Date.now() })); return true; } catch (e) { return false; } }
    function ortuLinkLupa() { try { localStorage.removeItem(ORTU_LINK_KEY); } catch (e) {} }
    function ortuLinkDariUrl() {
      const m = /[#&]masuk=(62[0-9]{8,13})\.([0-9a-f]{32})(?:&|$)/.exec(location.hash || '');
      return m ? { wa: m[1], tok: m[2] } : null;
    }
    function ortuLinkBersihkanUrl() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    function ortuMasukLink(c, dariUrl) {
      if (portalOrtuBusy) return;
      const errEl = ortuEl('portalOrtuError');
      ortuEl('portalOrtuNoWa').value = '0' + c.wa.slice(2);
      portalOrtuBusy = true; errEl.textContent = dariUrl ? '⏳ Membuka dengan link Anda...' : '⏳ Masuk otomatis...';
      let coba = false;   // link tersimpan sudah dicabut -> lanjut coba PIN tersimpan (kalau ada)
      ortuBukaSesi(c.wa, { l: ortuLinkHash(c.tok) }).catch(e => {
        if (!ortuDitolak(e)) throw e;
        ortuLinkLupa();
        ortuCatatRiwayatLogin(c.wa, 'link', 'gagal', null, dariUrl ? 'Link tidak berlaku' : 'Link tersimpan sudah dicabut');
        if (dariUrl) ortuLinkBersihkanUrl(); else coba = true;
        throw { tampil: 'Link ini sudah tidak berlaku. Minta link baru ke wali kelas/Admin, atau masuk dengan PIN.' };
      }).then(() => ortuCariAnak(c.wa)).then(anak => {
        if (!anak.length) throw { tampil: 'Nomor ini belum/tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
        ortuLinkSimpan(c.wa, c.tok);
        if (dariUrl) ortuLinkBersihkanUrl();
        bukaDashboardPortalOrtu(c.wa, anak, dariUrl ? 'link' : 'otomatis');
      }).catch(e => { errEl.textContent = ortuPesanError(e); })   // gagal jaringan: kredensial perangkat TIDAK dihapus
        .finally(() => { portalOrtuBusy = false; if (coba) ortuMasukOtomatis(); });
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
      if (ORTU_BUAT_PIN_BUTUH_LINK) { errEl.textContent = '⚠️ ' + ORTU_PESAN_BUTUH_LINK; return; }
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
          bukaDashboardPortalOrtu(waKey, anak, 'pertama');
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
      if (!portalOrtuBusy && typeof CryptoJS !== 'undefined') {
        const dariUrl = ortuLinkDariUrl(), link = dariUrl || ortuLinkBaca();   // link dari WhatsApp didahulukan
        if (link) { ortuMasukLink(link, !!dariUrl); return; }
      }
      const p = ortuPerangkatBaca();
      if (!p || portalOrtuBusy || typeof CryptoJS === 'undefined') return;
      const errEl = ortuEl('portalOrtuError');
      ortuEl('portalOrtuNoWa').value = '0' + p.wa.slice(2);
      portalOrtuBusy = true; errEl.textContent = '⏳ Masuk otomatis...';
      const basi = { tampil: 'PIN yang tersimpan di perangkat ini sudah tidak berlaku (mungkin diganti atau direset Admin). Silakan masuk dengan PIN.' };
      ortuBukaSesi(p.wa, { h: ortuHashPin(p.pin, p.wa) })
        .catch(e => { if (ortuDitolak(e)) { ortuPerangkatLupa(); throw basi; } throw e; })
        .then(() => {
          ortuCatatLoginAkun(p.wa);
          return ortuCariAnak(p.wa).then(anak => {
            if (!anak.length) throw { tampil: 'Nomor ini tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
            bukaDashboardPortalOrtu(p.wa, anak, 'otomatis');
          });
        }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function bukaDashboardPortalOrtu(waKey, anak, cara) {
      portalOrtuWaKey = waKey; portalOrtuAnak = anak;
      ortuCatatRiwayatLogin(waKey, cara || 'pin', 'berhasil', anak);
      ortuEl('portalOrtuError').textContent = '';
      ['portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      ortuEl('portalOrtuLogin').style.display = 'none';
      ortuEl('portalOrtuDashboard').style.display = 'block';
      ortuEl('portalOrtuGantiPin').style.display = 'none';
      const tanpaPin = !!ortuLinkBaca() && !ortuPerangkatBaca();   // masuk lewat link WA: belum ada PIN, tombol Ganti PIN disembunyikan
      document.querySelectorAll('#portalOrtuDashboard [onclick="toggleGantiPinOrtu()"]').forEach(b => { b.style.display = tanpaPin ? 'none' : ''; });
      const kartuLama = document.getElementById('portalOrtuBuatPinLink'); if (kartuLama) kartuLama.remove();
      if (ORTU_BUAT_PIN_BUTUH_LINK && tanpaPin) ortuTampilBuatPinLink(waKey);
      const sel = ortuEl('portalOrtuAnakSelect');
      sel.innerHTML = anak.map(a => `<option value="${escapeHtml(a.key)}">${escapeHtml(a.name || '-')} — ${escapeHtml(a.kelas || '-')}</option>`).join('');
      ortuEl('portalOrtuAnakWrap').style.display = anak.length > 1 ? 'block' : 'none';
      renderPortalOrtuDashboard(anak[0]);
    }
    // ---------- Buat PIN sendiri setelah masuk lewat link WhatsApp ----------
    function ortuTampilBuatPinLink(waKey) {
      db.ref('ortu_akun/' + waKey + '/v').once('value').then(sn => {   // hanya penanda ada/tidaknya akun; hash PIN tidak terbaca
        if (portalOrtuWaKey !== waKey) return;   // sudah keluar
        if (sn.exists()) {   // PIN sudah pernah dibuat (mis. lewat kartu ini lalu portal dibuka ulang lewat link): tombol Ganti PIN harus tampil
          document.querySelectorAll('#portalOrtuDashboard [onclick="toggleGantiPinOrtu()"]').forEach(b => { b.style.display = ''; });
          return;
        }
        if (document.getElementById('portalOrtuBuatPinLink')) return;
        const content = ortuEl('portalOrtuContent'); if (!content || !content.parentNode) return;
        const box = document.createElement('div'); box.id = 'portalOrtuBuatPinLink'; box.className = 'card'; box.style.cssText = 'margin-bottom:12px;border-left:4px solid #059669;';
        box.innerHTML = `<p style="font-weight:700;margin-bottom:4px;">🔑 Buat PIN (opsional)</p>
          <p class="text-muted" style="font-size:12px;margin-bottom:8px;">Dengan PIN, Bapak/Ibu juga bisa masuk dari HP lain memakai nomor WhatsApp, tanpa link.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
            <input id="portalOrtuBuatPinLink1" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="PIN 6 angka" style="flex:1;min-width:120px;">
            <input id="portalOrtuBuatPinLink2" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="Ulangi PIN" style="flex:1;min-width:120px;">
          </div>
          <button type="button" class="btn btn-success" style="font-size:12px;padding:6px 14px;" onclick="ortuBuatPinDariLink()">💾 Simpan PIN</button>
          <div id="portalOrtuBuatPinLinkMsg" style="margin-top:8px;font-size:12px;"></div>`;
        content.parentNode.insertBefore(box, content);
      }).catch(() => {});
    }
    function ortuBuatPinDariLink() {
      const msg = ortuEl('portalOrtuBuatPinLinkMsg'); if (!msg || portalOrtuBusy || !portalOrtuWaKey) return;
      if (typeof CryptoJS === 'undefined') { msg.style.color = '#dc2626'; msg.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman.'; return; }
      const p1 = ortuEl('portalOrtuBuatPinLink1').value.trim(), p2 = ortuEl('portalOrtuBuatPinLink2').value.trim();
      msg.style.color = '#dc2626';
      if (!ortuPinValid(p1)) { msg.textContent = '⚠️ PIN harus 6 angka.'; return; }
      if (ortuPinTerlaluMudah(p1)) { msg.textContent = '⚠️ PIN terlalu mudah ditebak. Pilih PIN lain.'; return; }
      if (p1 !== p2) { msg.textContent = '⚠️ Ulangi PIN tidak sama.'; return; }
      const waKey = portalOrtuWaKey;
      portalOrtuBusy = true; msg.textContent = '⏳ Menyimpan...';
      const hash = ortuHashPin(p1, waKey), sekarang = new Date().toISOString();
      // Rules hanya mengizinkan pembuatan bila akun belum ada DAN sesi ini terbukti lewat link yang masih berlaku.
      db.ref('ortu_akun/' + waKey + '/v').once('value').then(sn => {
        if (sn.exists()) throw { tampil: 'Nomor ini sudah punya PIN. Lupa PIN? Hubungi Admin untuk reset.' };
        return db.ref('ortu_akun/' + waKey).set({ pin: hash, v: 1, dibuat: sekarang, terakhirLogin: sekarang });
      }).catch(e => {
        if (ortuDitolak(e)) throw { tampil: 'Nomor ini sudah punya PIN, atau link masuk Anda sudah tidak berlaku. Lupa PIN? Hubungi Admin untuk reset.' };
        throw e;
      }).then(() => ortuBukaSesi(waKey, { h: hash })).then(() => {
        const k = document.getElementById('portalOrtuBuatPinLink'); if (k) k.remove();
        document.querySelectorAll('#portalOrtuDashboard [onclick="toggleGantiPinOrtu()"]').forEach(b => { b.style.display = ''; });
        toast('✅ PIN berhasil dibuat. Bisa dipakai untuk masuk dari HP lain.');
      }).catch(e => { msg.style.color = '#dc2626'; msg.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
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
      const hBaru = ortuHashPin(baru1, waKey);
      ortuBukaSesi(waKey, { h: ortuHashPin(lama, waKey) })   // membuktikan PIN lama ke Rules
        .catch(e => { if (ortuDitolak(e)) throw { tampil: 'PIN lama salah, atau akun sudah direset Admin. Silakan masuk ulang.' }; throw e; })
        .then(() => db.ref('ortu_akun/' + waKey).update({ pin: hBaru, diubah: new Date().toISOString(), gagal: null, kunciSampai: null }))
        .then(() => ortuBukaSesi(waKey, { h: hBaru }))
        .then(() => {
          msg.style.color = '#059669'; msg.textContent = '✅ PIN berhasil diganti.';
          const tersimpan = ortuPerangkatBaca();
          if (tersimpan && tersimpan.wa === waKey) ortuPerangkatSimpan(waKey, baru1, false);   // PIN pilihan sendiri: tidak lagi "otomatis"
          const infoPin = document.getElementById('portalOrtuPinOtomatis'); if (infoPin) infoPin.remove();
          ['portalOrtuPinLama', 'portalOrtuPinGanti1', 'portalOrtuPinGanti2'].forEach(id => { ortuEl(id).value = ''; });
        }).catch(e => { msg.style.color = '#dc2626'; msg.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }

    // Ringkasan Infaq untuk Portal Orang Tua: status minggu ini + riwayat pembayaran + PERKIRAAN tunggakan.
    // Hanya memakai data yang sudah dimuat portal (iuran_siswa milik anak ini + kalender_akademik), jadi tidak
    // perlu Rules baru. Tunggakan = minggu tahun ajaran aktif (dari 1 Juli sampai minggu LALU) yang belum tercatat
    // lunas, di luar minggu yang seluruh hari sekolahnya (Sen-Sab) tercatat libur di kalender akademik.
    // Nominal tunggakan memakai nominal siswa saat ini, jadi sifatnya perkiraan.
    // Kartu lipat (accordion) supaya halaman tidak terlalu panjang di HP: judul + lencana ringkas selalu terlihat,
    // isi baru terbuka saat diketuk. `badge` & `isi` sudah berupa HTML (escape dilakukan pemanggil).
    const poID = t => typeof poIkonDepan === 'function' ? poIkonDepan(t) : t;   // emoji awal judul -> ikon garis (portal-tab.js)
    function poAcc(judul, badge, isi, buka, id) {
      return `<details class="card po-acc"${id ? ' id="' + id + '"' : ''} style="margin-bottom:12px;"${buka ? ' open' : ''}><summary><span>${poID(judul)}</span>${badge || ''}</summary><div class="po-acc-body">${isi}</div></details>`;
    }
    const poBadge = (teks, kelas) => `<span class="po-badge${kelas ? ' ' + kelas : ''}">${teks}</span>`;
    const PO_ACC_CSS = `<style>.po-acc>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;font-weight:700;-webkit-tap-highlight-color:transparent}.po-acc>summary::-webkit-details-marker{display:none}.po-acc>summary>span:first-child{flex:1;min-width:0}.po-acc>summary::after{content:"▾";color:#6b7280;transition:transform .15s}.po-acc[open]>summary::after{transform:rotate(180deg)}.po-acc-body{margin-top:8px}.po-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:#f1f5f9;color:#475569;white-space:nowrap}.po-badge.warn{background:#fef3c7;color:#b45309}.po-badge.ok{background:#d1fae5;color:#047857}.po-badge.bad{background:#fee2e2;color:#b91c1c}.po-nilai{width:100%;table-layout:fixed}.po-nilai th,.po-nilai td{white-space:normal;word-break:break-word;font-size:13px;padding:6px 4px;vertical-align:top}.po-rk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.po-ub{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;text-align:left;padding:8px 10px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.po-ub:active{background:#f1f5f9}.po-ub-penuh{grid-column:span 2}.po-ub-j{font-size:12px;font-weight:600;color:#475569}.po-ub-u{font-size:19px;font-weight:800;line-height:1.15}.po-ub-s{font-size:11px;color:#6b7280}.po-ub-x{width:100%}#bsOrtuBox summary::-webkit-details-marker{display:none}@media(max-width:759px){#portalOrtuContent .card{padding:10px 12px!important;margin-bottom:8px!important}.po-ub{padding:7px 8px}.po-ub-j{font-size:11px}.po-ub-u{font-size:17px}.po-ub-s{font-size:10.5px}}#portalOrtuAnakWrap,#portalOrtuGantiPin{max-width:600px}@media(min-width:760px){#portalOrtuContent{column-count:2;column-gap:12px}#portalOrtuContent .card,#portalOrtuContent details{break-inside:avoid;-webkit-column-break-inside:avoid}#portalOrtuContent #poKopKehadiran,#portalOrtuContent #poRingkas{column-span:all}}</style>`;
    // ---------- Ringkasan satu layar (kartu #poRingkas, tepat di bawah kop anak) ----------
    // Kotak Kehadiran, Nilai, Infaq dihitung di sini. Kotak Amalan & Hafalan diisi js/bacaan-shalat.js lewat poIsiUbin()
    // begitu datanya selesai dimuat. Mengetuk kotak membuka bagian rinciannya dan menggulir ke sana.
    let portalOrtuInfaqRingkas = null;   // diisi portalOrtuInfaqHtml() setiap dashboard digambar
    function poBukaBagian(id) {
      const el = document.getElementById(id); if (!el) return;
      try { if (typeof ptTampilkanDi === 'function') ptTampilkanDi(el); } catch (e) { /* tab tidak aktif */ }
      if (el.tagName === 'DETAILS') el.open = true;
      else if (/^bsLp_/.test(id) && typeof bsLipatToggle === 'function' && typeof bsLipatBuka !== 'undefined' && bsLipatBuka[id.slice(5)] !== true) bsLipatToggle(id.slice(5));
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
    }
    // Semua teks yang dikirim ke poIsiUbin sudah berupa HTML aman (escape dilakukan pemanggil).
    function poIsiUbin(idEl, utama, warna, sub, extra) {
      const b = document.getElementById(idEl); if (!b) return;
      const u = b.querySelector('.po-ub-u'), t = b.querySelector('.po-ub-s'), x = b.querySelector('.po-ub-x');
      if (u) { u.innerHTML = utama; u.style.color = warna || ''; }
      if (t) t.innerHTML = sub || '';
      if (x) x.innerHTML = extra || '';
    }
    function poUbin(idEl, tujuan, judul, utama, warna, sub, penuh) {
      return `<button type="button" id="${idEl}" class="po-ub${penuh ? ' po-ub-penuh' : ''}" onclick="poBukaBagian('${tujuan}')"><span class="po-ub-j">${poID(judul)}</span><span class="po-ub-u" style="color:${warna}">${utama}</span><span class="po-ub-s">${sub}</span>${penuh ? '<span class="po-ub-x"></span>' : ''}</button>`;
    }
    function poRingkasInfaq() {
      const r = portalOrtuInfaqRingkas; if (!r) return { utama: '-', warna: '#6b7280', sub: 'Belum ada data' };
      if (r.gratis) return { utama: 'Bebas', warna: '#059669', sub: 'bebas iuran' };
      if (r.belum > 0) return { utama: r.belum + ' mgg', warna: '#dc2626', sub: 'belum lunas' };
      if (r.lunasIni) return { utama: 'Lancar', warna: '#059669', sub: 'lunas minggu ini' };
      return { utama: 'Belum', warna: '#d97706', sub: 'minggu ini' };
    }
    function poRingkasHtml(o) {
      const persen = o.totalAbsen > 0 ? Math.round(o.hadir / o.totalAbsen * 100) : null;
      const wHadir = persen === null ? '#6b7280' : persen >= 90 ? '#059669' : persen >= 75 ? '#d97706' : '#dc2626';
      const rata = o.rataNilai;
      const wNilai = rata === null ? '#6b7280' : o.nilaiSementara ? '#6b7280' : rata >= 75 ? '#059669' : rata < 60 ? '#dc2626' : '#d97706';
      const fmt = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
      const inf = poRingkasInfaq();
      return `<div class="card" id="poRingkas" style="margin-bottom:12px;">
        <p style="font-weight:700;font-size:13px;margin:0 0 8px;">${poID('📊 Ringkasan Ananda')} <span class="text-muted" style="font-weight:400;font-size:11px;">· ketuk kotak untuk rincian</span></p>
        <div class="po-rk-grid">
          ${poUbin('poRingkasHadir', 'poKopKehadiran', '📅 Kehadiran', persen === null ? '-' : persen + '%', wHadir, persen === null ? 'Belum ada absensi' : o.hadir + ' dari ' + o.totalAbsen + ' hari')}
          ${o.nilaiTutup ? poUbin('poRingkasNilai', 'poAccNilai', '📝 Nilai', '🔒', '#6b7280', 'Belum dibuka') : poUbin('poRingkasNilai', 'poAccNilai', '📝 Nilai', rata === null ? '-' : fmt(rata), wNilai, rata === null ? 'Belum ada nilai' : (o.nilaiSementara ? 'sementara' : o.nMapel + ' mapel'))}
          ${poUbin('poRingkasInfaq', 'poAccInfaq', '💵 Infaq', inf.utama, inf.warna, inf.sub)}
          ${poUbin('poRingkasAmalan', 'bsLp_amalan', '🏡 Amalan hari ini', '⏳', '#6b7280', 'Memuat...')}
          ${poUbin('poRingkasHafalan', 'bsLp_setoran', '📿 Hafalan bacaan sholat', '⏳', '#6b7280', 'Memuat...', true)}
        </div></div>`;
    }
    function portalOrtuInfaqHtml(siswa, iuran, kalenderSnap) {
      const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
      const tglPendek = iso => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? d.getDate() + ' ' + bln[d.getMonth()] + ' ' + d.getFullYear() : '-'; };
      const nomSkrg = iuranNominalSiswa(siswa);               // null = standar belum diatur, 0 = gratis
      const gratis = nomSkrg === 0;
      const kini = new Date(), mingguIni = isoMingguKey(kini);
      const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || kini.getFullYear();
      const awalTA = iuranMulaiSiswa(siswa);   // v8.407: tanggal mulai tagihan (madrasah atau khusus siswa)
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
      portalOrtuInfaqRingkas = { gratis, lunasIni: !!lunasMap[mingguIni], belum: belum.length, perkiraan: perkiraanTunggak };
      return poAcc(`💵 Infaq · TA ${escapeHtml(currentTahunAjaran)}`, gratis ? poBadge('Bebas', 'ok') : (belum.length ? poBadge(belum.length + ' mgg belum', 'bad') : poBadge('Lancar', 'ok')), `${statusIni}${ringkas}${blokTunggak}${blokRiwayat}
          <p class="text-muted" style="font-size:11px;margin-top:8px;">Berdasarkan catatan petugas infaq kelas. Minggu libur pada kalender akademik dan minggu berjalan tidak dihitung; nominal tunggakan adalah perkiraan. Bila ada selisih dengan catatan Bapak/Ibu, mohon hubungi wali kelas.</p>`, false, 'poAccInfaq');
    }
    // Satu query ditolak (Rules/jaringan) tidak lagi menggagalkan seluruh dashboard: node itu dianggap kosong
    // dan namanya dicatat di `gagal` supaya orang tua diberi tahu bahwa sebagian data belum termuat.
    const ORTU_SNAP_KOSONG = { forEach() { return false; }, numChildren() { return 0; }, val() { return null; }, exists() { return false; } };
    // Data yang SAMA untuk semua anak di kelas yang sama (absensi kelas, materi, tugas, jurnal hari ini, kalender, acara, ujian)
    // disimpan di memori 5 menit. Tanpa ini setiap ganti anak / kumpul tugas / buka ulang dasbor mengunduh ulang semuanya.
    // Hanya hidup selama halaman terbuka (hilang saat muat ulang atau Keluar), jadi tidak pernah basi lintas hari.
    const ORTU_CACHE_MS = 5 * 60000, _ortuCacheBersama = {};
    function ortuBacaBersama(kunci, ref, nama, gagal) {
      const c = _ortuCacheBersama[kunci];
      if (c && Date.now() - c.t < ORTU_CACHE_MS) return Promise.resolve(c.snap);
      return ref.once('value').then(snap => { _ortuCacheBersama[kunci] = { t: Date.now(), snap }; return snap; })
        .catch(e => { gagal.push(nama); console.warn('[SI MAMBA] Portal Ortu: gagal membaca ' + nama + ':', (e && e.message) || e); return ORTU_SNAP_KOSONG; });
    }
    function ortuBacaAman(ref, nama, gagal) {
      return ref.once('value').catch(e => { gagal.push(nama); console.warn('[SI MAMBA] Portal Ortu: gagal membaca ' + nama + ':', (e && e.message) || e); return ORTU_SNAP_KOSONG; });
    }
    function renderPortalOrtuDashboard(siswa) {
      const content = document.getElementById('portalOrtuContent');
      content.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">⏳ Memuat data...</p>';
      const monthStr = tglLokal().slice(0, 7);   // YYYY-MM menurut WIB, sama dengan format tanggal absensi
      const prevDate = new Date(parseInt(monthStr.slice(0, 4), 10), parseInt(monthStr.slice(5, 7), 10) - 2, 1);
      const prevMonthStr = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
      const NAMA_BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const labelBulan = ym => NAMA_BULAN_ID[parseInt(ym.slice(5, 7), 10) - 1] + ' ' + ym.slice(0, 4);
      // events & ujian: hanya 8 terdekat mulai hari ini (butuh ".indexOn": ["tanggal"] di Rules; tanpa itu tetap jalan, hanya lebih boros).
      const gagalMuat = [];
      // SAKLAR NILAI PER KELAS (v8.406): admin/wali kelas membuka nilai lewat halaman Raport -> node portal_nilai_v4/<kelas>.
      // Default TERTUTUP: node belum ada / Rules belum dipasang / gagal baca => nilai tidak ditampilkan dan tidak diunduh.
      const bukaP = ortuBacaAman(db.ref('portal_nilai_v4/' + String(siswa.kelas || '').replace(/[.#$\[\]\/]/g, '_').trim()), 'portal_nilai_v4', [])
        .then(sn => { const v = sn && sn.val && sn.val(); return !!(v && v.buka === true); });
      Promise.all([
        bukaP.then(b => b ? ortuBacaAman(db.ref('grades').orderByChild('siswaKey').equalTo(siswa.key), 'grades', gagalMuat) : ORTU_SNAP_KOSONG),
        ortuBacaAman(db.ref('kedisiplinan_siswa').orderByChild('siswaKey').equalTo(siswa.key), 'kedisiplinan_siswa', gagalMuat),
        ortuBacaAman(db.ref('iuran_siswa').orderByChild('siswaKey').equalTo(siswa.key), 'iuran_siswa', gagalMuat),
        ortuBacaAman(db.ref('buku_penghubung').orderByChild('siswaKey').equalTo(siswa.key), 'buku_penghubung', gagalMuat),
        // Hanya absensi BULAN INI + BULAN LALU (cadangan saat awal bulan belum ada absensi; dulu seluruh riwayat kelas, semua tahun). Filter kelas dilakukan di bawah.
        // HEMAT KUOTA: dulu absensi SEMUA kelas selama 2 bulan diunduh lalu disaring di browser (tiap catatan memuat status seluruh
        // siswa kelas). Sekarang hanya 80 catatan terakhir KELAS ANAK ini (indexOn kelas sudah ada di Rules); kunci push berurutan
        // waktu, 80 catatan menutup lebih dari 2 bulan hari sekolah. Penyaringan bulan & kelas di bawah tetap berlaku.
        ortuBacaBersama('absen|' + siswa.kelas, db.ref('attendance').orderByChild('kelas').equalTo(siswa.kelas).limitToLast(80), 'attendance', gagalMuat),
        ortuBacaBersama('materi|' + siswa.kelas, db.ref('materi_belajar').orderByChild('kelas').equalTo(siswa.kelas), 'materi_belajar', gagalMuat),
        ortuBacaBersama('tugas|' + siswa.kelas, db.ref('tugas').orderByChild('kelas').equalTo(siswa.kelas), 'tugas', gagalMuat),
        ortuBacaAman(db.ref('tugas_submission').orderByChild('siswaKey').equalTo(siswa.key), 'tugas_submission', gagalMuat),
        // Hanya jurnal HARI INI (dulu seluruh riwayat jurnal kelas). Filter kelas dilakukan di bawah.
        ortuBacaBersama('jurnal|' + tglLokal(), db.ref('journal').orderByChild('tanggal').equalTo(tglLokal()), 'journal', gagalMuat),
        ortuBacaBersama('kalender', db.ref('kalender_akademik'), 'kalender_akademik', gagalMuat),
        ortuBacaBersama('events|' + tglLokal(), db.ref('events').orderByChild('tanggal').startAt(tglLokal()).limitToFirst(8), 'events', gagalMuat),
        ortuBacaBersama('ujian|' + tglLokal(), db.ref('ujian').orderByChild('tanggal').startAt(tglLokal()).limitToFirst(8), 'ujian', gagalMuat),
        bukaP
      ]).then(([gradesSnap, sikapSnap, iuranSnap, bukuSnap, absenSnap, materiSnap, tugasSnap, submissionSnap, journalSnap, kalenderSnap, eventsSnap, ujianSnap, nilaiBuka]) => {
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
          <div class="text-muted" style="font-size:11px;">Jam ke-${escapeHtml(j.jam_ke)} — ${escapeHtml(j.subject||'-')}</div>
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
        const rekapAbsen = {}; rekapAbsen[monthStr] = { H: 0, S: 0, I: 0, A: 0 }; rekapAbsen[prevMonthStr] = { H: 0, S: 0, I: 0, A: 0 };
        absenSnap.forEach(c => {
          const rec = c.val();
          const bln = rec && rec.tanggal ? String(rec.tanggal).slice(0, 7) : '';
          if (rekapAbsen[bln] && rec.kelas === siswa.kelas && rec.data && rec.data[siswa.key] && sesuaiTahunAjaran(rec)) {
            const st = rec.data[siswa.key];
            if (rekapAbsen[bln][st] !== undefined) rekapAbsen[bln][st]++;
          }
        });
        const jumlahAbsen = r => r.H + r.S + r.I + r.A;
        // Awal bulan (mis. tanggal 1 / hari libur) sering belum ada absensi: kalau begitu tampilkan bulan lalu supaya tidak 0 semua.
        const pakaiBulanLalu = jumlahAbsen(rekapAbsen[monthStr]) === 0 && jumlahAbsen(rekapAbsen[prevMonthStr]) > 0;
        const bulanTampil = pakaiBulanLalu ? prevMonthStr : monthStr;
        const hadir = rekapAbsen[bulanTampil].H, sakit = rekapAbsen[bulanTampil].S, izin = rekapAbsen[bulanTampil].I, alfa = rekapAbsen[bulanTampil].A;
        const catatanAbsen = pakaiBulanLalu ? 'Absensi bulan ini belum tercatat, ditampilkan bulan lalu.'
          : (jumlahAbsen(rekapAbsen[monthStr]) === 0 ? 'Belum ada absensi tercatat bulan ini.' : '');
        // Nilai belum lengkap (NH, MID, atau PAS belum lengkap) tampil abu-abu berlabel "sementara", bukan angka rendah biasa.
        const nilaiRows = grades.map(g => { const st = statusRapor(g.data || {}); let sel = st.nilai === null ? '-' : (st.final ? st.nilai : raporSementaraHtml(st.nilai));
          // v8.412: predikat tampil untuk semua nilai; nilai sementara berlabel abu-abu "(sementara)"
          if (st.nilai !== null && typeof v4Predikat === 'function') { const pr = v4Predikat(st.nilai); sel += st.final ? `<br><span style="font-size:11px;font-weight:600;color:#065f46;">${pr.k} · ${escapeHtml(pr.label)}</span>` : `<br><span style="font-size:11px;font-weight:400;font-style:italic;color:#6b7280;">${pr.k} · ${escapeHtml(pr.label)} (sementara)</span>`; }
          return `<tr><td>${escapeHtml(g.subject||'-')}</td><td>${escapeHtml(g.semester||'-')}</td><td style="text-align:right;font-weight:700;">${sel}</td></tr>`; }).join('')
          + ((typeof v4PredikatBatas === 'function' && grades.some(g => { const st = statusRapor(g.data || {}); return st.nilai !== null; })) ? (() => { const t = v4PredikatBatas(); return `<tr><td colspan="3" style="font-size:11px;color:#6b7280;">Predikat: A Sangat Baik (≥ ${t.sb}), B Baik (${t.b}–${t.sb - 1}), C Cukup (${t.c}–${t.b - 1}), D Perlu Bimbingan (&lt; ${t.c}).</td></tr>`; })() : '')
          + (grades.some(g => { const st = statusRapor(g.data || {}); return st.nilai !== null && !st.final; }) ? `<tr><td colspan="3" style="font-size:11px;color:#6b7280;font-style:italic;">Nilai berlabel sementara belum final. Angka menjadi final setelah minimal satu NH, MID, dan PAS terisi.</td></tr>` : '');
        const totalPelanggaran = sikap.filter(d=>d.jenis==='pelanggaran').reduce((s,d)=>s+(Number(d.poin)||0),0);
        const totalPrestasi = sikap.filter(d=>d.jenis==='prestasi').reduce((s,d)=>s+(Number(d.poin)||0),0);
        const netSikap = totalPrestasi - totalPelanggaran;
        const sikapRows = [...sikap].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(d => `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span style="color:${d.jenis==='prestasi'?'#059669':'#dc2626'};font-weight:600;">${d.jenis==='prestasi'?'🌟':'⚠️'} ${escapeHtml(d.kategori||'-')}</span> <span class="text-muted">(${Number(d.poin) || 0} poin) — ${escapeHtml(d.tanggal||'-')}</span></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan.</p>';
        const iuranMingguIni = iuran.find(it => it.minggu === isoMingguKey());
        // Diagnosis infaq: bandingkan jumlah catatan mentah milik anak ini dengan yang lolos filter tahun ajaran.
        // Hanya ke Console (tidak ditampilkan ke orang tua). Buka Console HP/Chrome desktop untuk melihatnya.
        try {
          const mentah = iuranSnap.numChildren(), ditolak = [];
          iuranSnap.forEach(c => { const it = c.val(); if (!sesuaiTahunAjaran(it)) ditolak.push((c.key || '?') + ' [TA: ' + (it && it.tahunAjaran ? it.tahunAjaran : 'kosong') + ']'); });
          console.info('[SI MAMBA] Infaq portal: anak=' + siswa.key + ' (' + (siswa.name || '-') + '), catatan di database=' + mentah + ', tampil=' + iuran.length + ', TA aktif=' + currentTahunAjaran);
          if (ditolak.length) console.warn('[SI MAMBA] Infaq portal: ' + ditolak.length + ' catatan tidak tampil karena tahun ajaran tidak cocok:', ditolak.slice(0, 10));
        } catch (e) { /* diagnosis opsional */ }
        const infaqCardHtml = portalOrtuInfaqHtml(siswa, iuran, kalenderSnap);
        const bukuRows = [...buku].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(b => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div class="text-muted" style="font-size:12px;">${escapeHtml(b.tanggal||'-')}</div><div style="font-size:13px;">${escapeHtml(b.catatan||'-')}</div></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan dari guru.</p>';
        const materiRows = [...materi].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(m => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div style="font-size:13px;font-weight:600;">${escapeHtml(m.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(m.mapel||'-')} — ${escapeHtml(m.tanggal||'-')}</span></div><div class="text-muted" style="font-size:12px;margin-top:2px;">${escapeHtml(m.isi)}</div>${/^https?:\/\//i.test(String(m.link || '')) ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;">🔗 Buka Link</a>` : ''}</div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada materi dibagikan.</p>';
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
            <textarea id="jawabanTeks_${escapeHtml(t.key)}" class="field" rows="2" placeholder="Tulis jawaban di sini (opsional kalau cuma kirim foto)..." style="margin-bottom:6px;"></textarea>
            <input id="jawabanFoto_${escapeHtml(t.key)}" type="file" accept="image/*" style="font-size:12px;margin-bottom:6px;">
            <button class="btn btn-success" style="font-size:12px;padding:6px 12px;" onclick="kumpulTugasOrtu('${escapeJs(t.key)}','${escapeJs(siswa.key)}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kumpulkan Tugas</button>
          </div>`;
        }).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada tugas untuk kelas ini.</p>';
        const belumTugas = tugasList.filter(t => !submissionMap[t.key]).length;
        const nSementara = grades.filter(g => { const st = statusRapor(g.data || {}); return st.nilai !== null && !st.final; }).length;
        const nilaiTabelHtml = grades.length
          ? `<table class="po-nilai"><colgroup><col style="width:54%"><col style="width:22%"><col style="width:24%"></colgroup><thead><tr><th>Mapel</th><th>Semester</th><th style="text-align:right;">Nilai</th></tr></thead><tbody>${nilaiRows}</tbody></table>`
          : '<p class="text-muted" style="font-size:13px;">Belum ada nilai tercatat.</p>';
        // Ringkasan satu layar: nilai = rata-rata semester aktif (hanya yang final bila ada; bila belum ada yang final, rata-rata sementara).
        const semAktif = (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif) ? currentSemesterAktif : '';
        let gSem = grades.filter(g => semAktif && g.semester === semAktif);
        const pakaiSem = gSem.length > 0; if (!pakaiSem) gSem = grades;
        const stSem = gSem.map(g => statusRapor(g.data || {})).filter(st => st.nilai !== null);
        const stFinal = stSem.filter(st => st.final);
        const dasarNilai = stFinal.length ? stFinal : stSem;
        const ringkasHtml = poRingkasHtml({
          hadir, totalAbsen: jumlahAbsen(rekapAbsen[bulanTampil]), labelBulan: labelBulan(bulanTampil),
          rataNilai: dasarNilai.length ? dasarNilai.reduce((a, st) => a + st.nilai, 0) / dasarNilai.length : null,
          nMapel: dasarNilai.length, nilaiSementara: stFinal.length === 0, nilaiTutup: !nilaiBuka, labelSemester: pakaiSem ? 'Semester ' + semAktif : 'TA ' + currentTahunAjaran
        });
        content.innerHTML = `
          <div class="card" id="poKopKehadiran" style="margin-bottom:8px;">
            <p id="poSapaan" style="font-size:12px;margin:0 0 6px;color:#0b6b4f;font-weight:600;">Assalamu\'alaikum, Bapak/Ibu <span class="text-muted" style="font-weight:400;">· kabar terbaru Ananda</span></p>
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="logo/logo-lembaga.png" alt="Logo ${escapeHtml(MADRASAH.nama || 'madrasah')}" width="36" height="36" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">
              <div style="min-width:0;">
                <p class="text-muted" style="font-size:11px;margin:0;">${escapeHtml(MADRASAH.nama || '')}</p>
                <p style="font-size:17px;font-weight:800;margin:0;line-height:1.2;">${escapeHtml(siswa.name)}</p>
                <p class="text-muted" style="font-size:12px;margin:0;">${/^kelas\b/i.test(String(siswa.kelas || '')) ? escapeHtml(siswa.kelas) : 'Kelas ' + escapeHtml(siswa.kelas)}</p>
              </div>
            </div>
            <div style="border-top:1px solid #f1f5f9;margin-top:8px;padding-top:8px;">
              <p style="font-weight:700;font-size:13px;margin:0 0 6px;">${poID('📅 Kehadiran Bulan Ini')} <span class="text-muted" style="font-weight:400;font-size:11px;">· ${escapeHtml(labelBulan(bulanTampil))}</span></p>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;">
                <div><div style="font-size:18px;font-weight:800;line-height:1.2;color:#059669;">${hadir}</div><div class="text-muted" style="font-size:11px;">Hadir</div></div>
                <div><div style="font-size:18px;font-weight:800;line-height:1.2;color:#d97706;">${sakit}</div><div class="text-muted" style="font-size:11px;">Sakit</div></div>
                <div><div style="font-size:18px;font-weight:800;line-height:1.2;color:#2563eb;">${izin}</div><div class="text-muted" style="font-size:11px;">Izin</div></div>
                <div><div style="font-size:18px;font-weight:800;line-height:1.2;color:#dc2626;">${alfa}</div><div class="text-muted" style="font-size:11px;">Alfa</div></div>
              </div>
              ${catatanAbsen ? `<p class="text-muted" style="font-size:11px;font-style:italic;margin:8px 0 0;text-align:center;">${catatanAbsen}</p>` : ''}
            </div>
          </div>
          ${gagalMuat.length ? '<div class="card" style="margin-bottom:8px;border-left:4px solid #d97706;font-size:12px;">⚠️ Sebagian data belum bisa dimuat. Tarik ke bawah untuk muat ulang, atau hubungi Admin bila berulang.</div>' : ''}
          <div id="persetujuanOrtuSlot"></div>
          ${ringkasHtml}
          ${poAcc('📝 Tugas', belumTugas ? poBadge(belumTugas + ' belum', 'warn') : (tugasList.length ? poBadge('Selesai', 'ok') : poBadge('Kosong')), tugasRows, belumTugas > 0)}
          ${nilaiBuka ? poAcc('📝 Nilai Terakhir', grades.length ? poBadge(grades.length + ' mapel' + (nSementara ? ' · ' + nSementara + ' sementara' : '')) : poBadge('Kosong'), nilaiTabelHtml, false, 'poAccNilai') : poAcc('📝 Nilai Terakhir', poBadge('Belum dibuka'), '<p class="text-muted" style="font-size:13px;">Nilai raport belum dibuka oleh madrasah. Silakan menunggu informasi dari wali kelas.</p>', false, 'poAccNilai')}
          ${poAcc('📆 Agenda Terdekat', agendaList.length ? poBadge(agendaList.length + ' agenda') : poBadge('Kosong'), agendaRows, false)}
          ${poAcc('📘 Hasil Belajar Hari Ini', journalHariIni.length ? poBadge(journalHariIni.length + ' jam') : poBadge('Kosong'), journalRows, false)}
          ${poAcc('📚 Materi Belajar Terbaru', materi.length ? poBadge(Math.min(materi.length, 5) + ' materi') : poBadge('Kosong'), materiRows, false)}
          ${poAcc('🌟 Sikap &amp; Kedisiplinan', poBadge((netSikap >= 0 ? '+' : '') + netSikap + ' poin', netSikap < 0 ? 'bad' : (netSikap > 0 ? 'ok' : '')), `<p style="font-size:13px;margin-bottom:6px;">Net Poin: <strong style="color:${netSikap>=0?'#059669':'#dc2626'};">${netSikap>=0?'+':''}${netSikap}</strong> (⚠️ ${totalPelanggaran} / 🌟 ${totalPrestasi})</p>${sikapRows}`, false)}
          ${infaqCardHtml}
          ${poAcc('📖 Buku Penghubung Terbaru', buku.length ? poBadge(Math.min(buku.length, 5) + ' catatan') : poBadge('Kosong'), bukuRows, false)}
          <div id="angketOrtuSlot"></div>
          <div id="angketSiswaSlot"></div>
          <div id="angketKeunggulanOrtuSlot"></div>
          <div id="angketKeunggulanSiswaSlot"></div>
          <details class="card po-acc">
            <summary><span>${poID('💬 Saran &amp; Kritik untuk Madrasah')}</span></summary>
            <div class="po-acc-body">
            <p class="text-muted" style="font-size:12px;margin-bottom:8px;">Masukan Bapak/Ibu membantu madrasah menjadi lebih baik. Bisa dikirim dengan nama, atau anonim kalau memang lebih nyaman.</p>
            <textarea id="saranKritikTeks" class="field" rows="3" maxlength="1000" placeholder="Tulis saran atau kritik di sini..."></textarea>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:8px 0;cursor:pointer;">
              <input type="checkbox" id="saranKritikAnonim"> Kirim sebagai anonim (nama &amp; kelas tidak disertakan)
            </label>
            <button class="btn btn-primary" id="btnKirimSaranKritik" style="font-size:12px;padding:7px 14px;" onclick="kirimSaranKritik('${escapeJs(siswa.key)}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kirim ke Madrasah</button>
            <div id="saranKritikStatus" style="margin-top:8px;font-size:12px;"></div>
            </div>
          </details>
          ${PO_ACC_CSS}
        `;
        try { if (typeof bsOrtuRender === 'function') bsOrtuRender(siswa); } catch (e) { console.warn('[SI MAMBA] Bacaan Shalat (Portal Ortu) gagal dirender:', e); }
        try { if (typeof angketProfilOrtuRender === 'function') angketProfilOrtuRender(siswa); } catch (e) { console.warn('[SI MAMBA] Angket Profil Lulusan (Portal Ortu) gagal dirender:', e); }
        try { angketOrtuMuat(siswa); angketSiswaMuat(siswa); } catch (e) { console.warn('[SI MAMBA] Angket Kurikulum (Portal Ortu) gagal dimuat:', e); }
        try { angketKeunggulanMuat('ortu', siswa); angketKeunggulanMuat('siswa', siswa); } catch (e) { console.warn('[SI MAMBA] Angket Keunggulan (Portal Ortu) gagal dimuat:', e); }
        try { if (typeof persetujuanOrtuMuat === 'function') persetujuanOrtuMuat(siswa); } catch (e) { console.warn('[SI MAMBA] Persetujuan (Portal Ortu) gagal dimuat:', e); }
      }).catch(err => { content.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;">Gagal memuat data: ${err.message}</p>`; });
    }
    // ---------- Angket Kurikulum untuk orang tua (modul: js/angket.js) ----------
    // Kartu hanya muncul kalau Admin/Kepala sudah MEMBUKA angket (tombol ON). Satu isian per orang tua
    // (bukan per anak) per periode. Kunci data = hash dari No. WA, jadi No. WA tidak terbaca di database
    // dan isian anonim benar-benar tidak bisa ditelusuri ke orang tua tertentu.
    function angketOrtuKunci(waKey) {
      const t = String(waKey || '');
      let a = 2166136261, b = 5381;
      for (let i = 0; i < t.length; i++) { a ^= t.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; b = (Math.imul(b, 33) + t.charCodeAt(i)) >>> 0; }
      return 'o' + a.toString(36) + b.toString(36);
    }
    // Satu fungsi untuk dua kartu: jenis 'ortu' (satu isian per orang tua) dan 'siswa' (satu isian per anak,
    // diisi anak dengan didampingi orang tua). Kunci siswa = hash dari kunci siswa, jadi tidak bisa ditelusuri.
    function angketPortalMuat(jenis, siswa) {
      const ortu = jenis === 'ortu';
      const slotId = ortu ? 'angketOrtuSlot' : 'angketSiswaSlot';
      if (!document.getElementById(slotId) || typeof AngketKurikulum === 'undefined') return;
      const kunci = angketOrtuKunci(ortu ? portalOrtuWaKey : 'siswa:' + siswa.key);
      const accId = ortu ? 'angketOrtuAcc' : 'angketSiswaAcc', wadahId = ortu ? 'angketOrtuWadah' : 'angketSiswaWadah';
      AngketKurikulum.cekAktif().then(st => {
        if (!st.aktif || !document.getElementById(slotId)) return;
        return db.ref('angket_kurikulum/' + st.periode + '/' + jenis + '/' + kunci).once('value').then(x => x.exists(), () => false).then(sudah => {
          const slot2 = document.getElementById(slotId); if (!slot2) return;
          const judul = ortu ? '📝 Angket Orang Tua' : '🧒 Angket Peserta Didik · ' + escapeHtml(siswa.name || '-');
          const pengantar = ortu
            ? 'Angket tentang pembelajaran di madrasah ini. Sekitar 5–10 menit. Tidak ada jawaban benar atau salah, dan jawaban hanya dipakai untuk perbaikan.'
            : 'Untuk Ananda. Mohon <b>didampingi</b>: bacakan tiap pernyataan, lalu biarkan Ananda memilih jawabannya sendiri sesuai yang ia alami di kelas. Bukan ujian, tidak memengaruhi nilai.';
          slot2.innerHTML = `<details class="card po-acc" id="${accId}" style="margin-bottom:12px;"><summary><span>${poID(judul)}</span>${sudah ? poBadge('Sudah diisi', 'ok') : poBadge('Mohon diisi', 'warn')}</summary>
            <div class="po-acc-body"><p class="text-muted" style="font-size:12px;margin-bottom:8px;">${pengantar}</p><div id="${wadahId}"></div></div></details>`;
          const acc = document.getElementById(accId); let dimuat = false;
          acc.addEventListener('toggle', () => {
            if (!acc.open || dimuat) return; dimuat = true;
            const nama = ortu ? 'Wali dari ' + (siswa.name || '-') + ' (' + (siswa.kelas || '-') + ')' : (siswa.name || '-') + ' (' + (siswa.kelas || '-') + ')';
            AngketKurikulum.renderForm(wadahId, jenis, { kunci, nama }, { izinAnonim: true });
          });
        });
      }).catch(() => {});
    }
    function angketOrtuMuat(siswa) { angketPortalMuat('ortu', siswa); }
    function angketSiswaMuat(siswa) { angketPortalMuat('siswa', siswa); }
    // ---------- Angket Keunggulan Madrasah untuk orang tua / siswa (modul: js/angket-keunggulan.js) ----------
    // Sama dengan Angket Kurikulum di atas: kartu muncul hanya saat angket keunggulan DIBUKA (ON), kunci data = hash
    // (tanpa No. WA), isian anonim tidak bisa ditelusuri. Hanya sisi Minat (3 butir per bidang) + pilihan bidang prioritas; kartu siswa hanya untuk kelas 4-6. Path data: angket_keunggulan/...
    function angketKeunggulanMuat(jenis, siswa) {
      const ortu = jenis === 'ortu';
      const slotId = ortu ? 'angketKeunggulanOrtuSlot' : 'angketKeunggulanSiswaSlot';
      if (!document.getElementById(slotId) || typeof AngketKeunggulan === 'undefined') return;
      // Angket siswa hanya untuk kelas 4-6 (kelas 1-3 cukup lewat orang tua). Kelas kosong/tak terbaca = tetap tampil.
      if (!ortu && AngketKeunggulan.kelasBolehSiswa && !AngketKeunggulan.kelasBolehSiswa(siswa.kelas)) return;
      const kunci = angketOrtuKunci(ortu ? portalOrtuWaKey : 'siswa:' + siswa.key);
      const accId = ortu ? 'angketKeunggulanOrtuAcc' : 'angketKeunggulanSiswaAcc', wadahId = ortu ? 'angketKeunggulanOrtuWadah' : 'angketKeunggulanSiswaWadah';
      AngketKeunggulan.cekAktif().then(st => {
        if (!st.aktif || !document.getElementById(slotId)) return;
        return db.ref('angket_keunggulan/' + st.periode + '/' + jenis + '/' + kunci).once('value').then(x => x.exists(), () => false).then(sudah => {
          const slot2 = document.getElementById(slotId); if (!slot2) return;
          const judul = ortu ? '🌟 Angket Keunggulan Madrasah' : '🌟 Angket Keunggulan · ' + escapeHtml(siswa.name || '-');
          const pengantar = ortu
            ? 'Bidang apa yang Bapak/Ibu harapkan berkembang di madrasah (Tahfidz, Bahasa, Seni &amp; Olahraga, Sains &amp; Riset, Kewirausahaan &amp; Literasi Digital)? Sekitar 3 menit.'
            : 'Untuk Ananda. Mohon <b>didampingi</b>: bacakan tiap pernyataan, lalu biarkan Ananda memilih sendiri kegiatan yang ia sukai. Bukan ujian, tidak memengaruhi nilai.';
          slot2.innerHTML = `<details class="card po-acc" id="${accId}" style="margin-bottom:12px;"><summary><span>${poID(judul)}</span>${sudah ? poBadge('Sudah diisi', 'ok') : poBadge('Mohon diisi', 'warn')}</summary>
            <div class="po-acc-body"><p class="text-muted" style="font-size:12px;margin-bottom:8px;">${pengantar}</p><div id="${wadahId}"></div></div></details>`;
          const acc = document.getElementById(accId); let dimuat = false;
          acc.addEventListener('toggle', () => {
            if (!acc.open || dimuat) return; dimuat = true;
            const nama = ortu ? 'Wali dari ' + (siswa.name || '-') + ' (' + (siswa.kelas || '-') + ')' : (siswa.name || '-') + ' (' + (siswa.kelas || '-') + ')';
            AngketKeunggulan.renderForm(wadahId, jenis, { kunci, nama, kelas: siswa.kelas }, { izinAnonim: true });
          });
        });
      }).catch(() => {});
    }
    // Saran & Kritik dari Portal Orang Tua -- disimpan terpisah dari data siswa lain (tidak ikut
    // di-load lagi ke portal setelah kirim, sekali kirim langsung selesai) supaya orang tua tidak
    // bisa lihat balik kiriman orang lain. Opsi anonim: siswaKey/siswaNama/kelas cuma diisi kalau
    // TIDAK anonim -- kalau anonim, field itu sengaja null (Admin tidak akan tahu identitasnya).
    function kirimSaranKritik(siswaKey, siswaNama, kelas) {
      if (isBusy('kirimSaranKritik')) return;
      const teks = document.getElementById('saranKritikTeks').value.trim().slice(0, 1000);   // Rules: pesan maks. 1000 karakter
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
        if (err) { statusEl.innerHTML = `<span style="color:#dc2626;">❌ Gagal mengirim: ${escapeHtml(err.message)}</span>`; return; }
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
      const kunciBusy = 'kumpulTugasOrtu_' + tugasKey + '_' + siswaKey;
      if (isBusy(kunciBusy)) { toast('⏳ Sedang mengirim, mohon tunggu...', false, 1500); return; }
      const jawabanTeks = (document.getElementById('jawabanTeks_'+tugasKey).value || '').trim();
      const fileInput = document.getElementById('jawabanFoto_'+tugasKey);
      const file = fileInput.files && fileInput.files[0];
      if (!jawabanTeks && !file) { toast('⚠️ Isi jawaban teks atau lampirkan foto dulu.', true); return; }
      if (file && !/^image\//.test(file.type)) { toast('⚠️ File harus berupa gambar!', true); return; }
      setBusy(kunciBusy, null);
      const lepas = () => clearBusy(kunciBusy, null);
      setTimeout(lepas, 30000);   // cadangan bila sinyal sangat lemah supaya tombol tidak macet
      const simpanKumpul = (fotoDataUrl) => {
        const ref = db.ref(`tugas_submission/${tugasKey}_${siswaKey}`);
        ref.set({ tugasKey, siswaKey, siswaNama, kelas, jawabanTeks: jawabanTeks || null, hasFoto: !!fotoDataUrl, waktuKumpul: new Date().toISOString(), tahunAjaran: currentTahunAjaran }, err => {
          lepas();
          if (err) { toast('❌ Gagal mengumpulkan: ' + err.message, true); return; }
          simpanFotoTerpisah('tugas_submission', tugasKey + '_' + siswaKey, fotoDataUrl); // set / hapus foto (kumpul ulang tanpa foto = foto lama dihapus)
          toast('✅ Tugas berhasil dikumpulkan!');
          const siswa = portalOrtuAnak.find(a => a.key === siswaKey) || { key: siswaKey, name: siswaNama, kelas };   // objek utuh (nominal iuran dsb.), bukan yang dipangkas
          renderPortalOrtuDashboard(siswa);
        });
      };
      if (!file) { simpanKumpul(null); return; }
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
        img.onerror = () => { lepas(); toast('Gagal memproses foto.', true); };
        img.src = e.target.result;
      };
      reader.onerror = () => { lepas(); toast('Gagal membaca file.', true); };
      reader.readAsDataURL(file);
    }
