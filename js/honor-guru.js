// ============================================================
// honor-guru.js -- HONOR GURU (dipecah dari app.js, tahap 3)
// ============================================================
// Isi: honor sholat berbasis check-in (honorSholat*), tarif ekstra & ekskul, ranking Guru Terajin,
// tarif honor V4 (v4GetHonorRates/v4HitungHonor), halaman Honor (renderHonor), panjar honor
// (honorPanjar*), jadwal bayar, pengingat, catat ke Kas, Slip Honor Saya, dan PDF Rekap Honor Guru
// (downloadHonorPDF).
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat selain pembungkus
// pemuat PDF malas di bagian paling bawah berkas ini.
// TETAP di app.js: saveReligi() (stub), getJamReligi(), v4HariDiizinkanSholat(), v4CariJenisKegiatanSholat(),
// v4KataKunciSholat(), v4SeedJenisSholatRutin(), v4AbsensiSiswaSholatSudahDiisi() -- bagian absensi sholat,
// dan generateHonorReport() (ada di js/laporan-rekap.js).
// ============================================================

    // ============================================================
    // HONOR SHOLAT (Dhuha & Dzuhur) -- DIHITUNG DARI CHECK-IN PETUGAS
    // ============================================================
    // Aturan: honor sholat = check-in QR petugas (activity_checkin_v4) + jam check-in dalam jendela. Absensi siswa lengkap hanya jadi syarat bila HONOR_SHOLAT_WAJIB_ABSENSI_SISWA = true.
    // "Absen Religi Saya" tidak dipakai lagi (saveReligi dicabut). Check-in boleh offline, jadi honor tidak bergantung pada langkah kedua.
    // Pemeriksaan jam & kelengkapan dilakukan SAAT REKAP DIHITUNG (data sudah di server), bukan saat guru menyimpan.
    // Hari yang tidak lolos TIDAK dihitung dan ditandai (beserta alasannya) di Rekap Honor, Slip, dan Laporan.
    // Jendela jam = getJamReligi(): Dhuha 06:30-09:00, Dzuhur 11:00-12:30, dinilai dari jam check-in (WIB).
    // Tanggal < HONOR_SHOLAT_MULAI_CHECKIN tetap dihitung dari Absen Religi lama (religi_attendance) supaya honor/slip lama tidak berubah.
    // Koreksi Admin (>= tanggal itu) disimpan di honor_koreksi_sholat, bukan mengubah check-in.
    const HONOR_SHOLAT_MULAI_CHECKIN = '2026-10-15';
    // SAKELAR: false = honor sholat HANYA butuh check-in QR petugas yang jamnya dalam jendela sholat (absensi siswa TIDAK jadi syarat).
    // true = seperti sebelumnya: wajib absensi siswa lengkap, dicocokkan menurut TANGGAL SHOLAT (bukan kapan diisi), jadi isian susulan
    // untuk tanggal lampau tetap melengkapi hari itu.
    const HONOR_SHOLAT_WAJIB_ABSENSI_SISWA = true;
    const HONOR_SHOLAT_TTL_MS = 5 * 60 * 1000;
    const HONOR_SHOLAT_TOLERANSI_MS = 5 * 60 * 1000;   // jam check-in boleh "lebih maju" maksimal ini dari jam server
    let honorSholatCache = {};   // 'YYYY-MM' -> { status:'loading'|'ok'|'gagal', at, hasil, error, tunggu:[] }

    function honorSholatInvalidate() { honorSholatCache = {}; honorSiswaKelasCache = null; }
    // ---- Dialog modal sendiri (pengganti prompt()/confirm() yang memblokir & berlapis) ----
    // honorModal({ judul, isiHtml, okLabel, batalLabel, ambil }) -> Promise<hasil|null>. judul/isiHtml = HTML tepercaya (escape data pengguna dulu).
    // ambil(overlay) dipanggil saat OK: kembalikan { galat:'pesan' } (dialog tetap terbuka) atau { nilai:... } (ditutup, nilai jadi hasil). Esc/Batal/klik latar = null.
    function honorModal(opt) {
      return new Promise(resolve => {
        const ov = document.createElement('div'); ov.className = 'modal-overlay';
        ov.innerHTML = '<div class="modal-box" style="max-width:460px;" role="dialog" aria-modal="true" aria-labelledby="honorModalJudul">'
          + '<h3 id="honorModalJudul" style="font-size:18px;font-weight:700;margin-bottom:12px;">' + (opt.judul || '') + '</h3>'
          + '<div>' + (opt.isiHtml || '') + '</div>'
          + '<p class="honor-modal-galat" role="alert" style="color:#b91c1c;font-size:13px;min-height:18px;margin:8px 0 0;"></p>'
          + '<div style="display:flex;gap:12px;margin-top:12px;"><button type="button" class="btn btn-success" style="flex:1;" data-aksi="ok">' + (opt.okLabel || 'OK') + '</button>'
          + '<button type="button" class="btn btn-soft" style="flex:1;" data-aksi="batal">' + (opt.batalLabel || 'Batal') + '</button></div></div>';
        document.body.appendChild(ov);
        let selesai = false;
        const tutup = hasil => { if (selesai) return; selesai = true; document.removeEventListener('keydown', onKey, true); ov.classList.remove('show'); ov.remove(); resolve(hasil); };
        const kirim = () => {
          const r = (typeof opt.ambil === 'function') ? opt.ambil(ov) : { nilai: true };
          if (r && r.galat) { ov.querySelector('.honor-modal-galat').textContent = r.galat; return; }
          tutup(r ? r.nilai : true);
        };
        const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); tutup(null); } else if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') { e.preventDefault(); kirim(); } };
        document.addEventListener('keydown', onKey, true);
        ov.addEventListener('click', e => { if (e.target === ov) tutup(null); else { const a = e.target.closest && e.target.closest('[data-aksi]'); if (a) { if (a.getAttribute('data-aksi') === 'ok') kirim(); else tutup(null); } } });
        requestAnimationFrame(() => { ov.classList.add('show'); const f = ov.querySelector('input,select,textarea') || ov.querySelector('[data-aksi="ok"]'); if (f) try { f.focus(); } catch (e) { /* diabaikan */ } });
      });
    }

    function honorSholatNama(jenis) { return jenis === 'sholat_dluha' ? 'Dhuha' : 'Dzuhur'; }
    // SATU util resolve identitas guru untuk seluruh honor (sholat, rekap, slip). Urutan: guruKey bila ada -> cari
    // guruKey lewat nama di allGuru -> nama mentah (record lama tanpa guruKey tetap terhitung). Bila ada dua guru
    // bernama sama, yang DIPAKAI adalah yang pertama di allGuru (konsisten di semua tempat).
    // Untuk banyak pemanggilan (loop), buat resolver SEKALI lewat honorBuatResolver() lalu pakai ulang -- peta nama->key
    // dibangun ulang tiap kali, jadi selalu mengikuti allGuru terbaru.
    function honorBuatResolver() {
      const peta = Object.create(null);
      (allGuru || []).forEach(g => { if (g && g.key && g.name && peta[g.name] === undefined) peta[g.name] = g.key; });
      return (guruKey, nama) => guruKey || peta[nama] || nama;
    }
    function honorSholatResolve(guruKey, nama) { return honorBuatResolver()(guruKey, nama); }
    function honorSholatNamaGuru(gk, fallback) {
      const g = (allGuru || []).find(x => x && x.key === gk);
      return (g && g.name) || fallback || gk;
    }
    // Jam & tanggal WIB (UTC+7) dari epoch-ms, tidak bergantung zona waktu perangkat.
    function honorSholatWib(ms) {
      const d = new Date(ms + 7 * 3600 * 1000), p = n => String(n).padStart(2, '0');
      return { tgl: d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()), menit: d.getUTCHours() * 60 + d.getUTCMinutes(), jam: p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) };
    }
    function honorSholatMenit(s) { const p = String(s || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
    function honorSholatJenisType(typeId) {
      const t = (typeof v4ActTypeByKey === 'function') ? v4ActTypeByKey(typeId) : null;
      return (t && typeof v4ActJenisSholat === 'function') ? v4ActJenisSholat(t) : null;
    }
    // Inti perhitungan (murni, tanpa akses Firebase). c = { ym, religiLama[], checkins{}, koreksi{}, hadirSiswa{jenis:{tgl:Set}},
    // siswaWajib{jenis:[{kelas,siswa:[{key,name}]}]}, jenisType(typeId), hariOk(jenis,tgl) }.
    // Hasil: { perGuru:{gk:{nama,dluha,dzuhur}}, ditolak:[{gk,nama,tgl,jenis,alasan}], entri:{'gk|tgl|jenis':{...,sistemLolos,lolos,koreksi}} }
    function honorSholatHitung(c) {
      const hasil = { perGuru: {}, ditolak: [], entri: {} };
      const resolveGk = honorBuatResolver();
      const ambil = (gk, nama) => hasil.perGuru[gk] || (hasil.perGuru[gk] = { nama: honorSholatNamaGuru(gk, nama), dluha: 0, dzuhur: 0 });
      // 1) Sebelum aturan baru: Absen Religi lama (sama seperti rumus lama).
      (c.religiLama || []).forEach(r => {
        if (!r || !r.tanggal || r.tanggal.slice(0, 7) !== c.ym || r.tanggal >= HONOR_SHOLAT_MULAI_CHECKIN) return;
        const g = ambil(resolveGk(r.guruKey, r.guru), r.guru);
        if (r.sholat_dluha && r.sholat_dluha.status === 'Hadir') g.dluha += 1;
        if (r.sholat_dzuhur && r.sholat_dzuhur.status === 'Hadir') g.dzuhur += 1;
      });
      // 2) Aturan baru: check-in + jam + kelengkapan absensi siswa.
      const entri = hasil.entri, petugasHari = {};
      Object.keys(c.checkins || {}).forEach(k => {
        const ci = c.checkins[k]; if (!ci) return;
        const tgl = ci.tanggal || String(k).slice(0, 10);
        if (tgl < HONOR_SHOLAT_MULAI_CHECKIN || tgl.slice(0, 7) !== c.ym) return;
        const jenis = c.jenisType(ci.typeId || String(k).slice(11)); if (!jenis) return;   // bukan kegiatan sholat
        const gk = resolveGk(ci.guruKey, ci.guruName), alasan = [], nm = honorSholatNama(jenis);
        if (!c.hariOk(jenis, tgl)) alasan.push('Hari itu bukan jadwal Sholat ' + nm);
        const ms = Number(ci.atMs) || Date.parse(ci.at);
        if (!(ms > 0)) alasan.push('Jam check-in tidak terbaca');
        else {
          const w = honorSholatWib(ms), win = getJamReligi(jenis);
          if (w.tgl !== tgl) alasan.push('Tanggal jam check-in (' + w.tgl + ') tidak sama dengan tanggal check-in');
          else if (w.menit < honorSholatMenit(win.mulai) || w.menit > honorSholatMenit(win.selesai)) alasan.push('Check-in pukul ' + w.jam + ' di luar jam ' + win.mulai + '-' + win.selesai);
          if (Number(ci.serverAt) > 0 && ms > Number(ci.serverAt) + HONOR_SHOLAT_TOLERANSI_MS) alasan.push('Jam check-in lebih maju dari jam server');
        }
        if (HONOR_SHOLAT_WAJIB_ABSENSI_SISWA) {   // kunci = tanggal sholat (tgl), bukan waktu pengisian
          const sudah = ((c.hadirSiswa || {})[jenis] || {})[tgl] || new Set(), rinci = [];
          const kelasKosong = [];
          ((c.siswaWajib || {})[jenis] || []).forEach(g => {
            // Kelas wajib tanpa data siswa TIDAK boleh dianggap "lengkap" (daftar kosong lolos tanpa absensi apa pun). Bisa karena data siswa
            // belum termuat / nama kelas salah / Rules menolak baca; kelasnya tidak bisa diverifikasi -> hari ditolak + alasan jelas.
            if (!g.siswa || g.siswa.length === 0) { kelasKosong.push(g.kelas); return; }
            const wajibHariIni = g.siswa.filter(s => !(s.masuk && s.masuk > tgl)); // belum terdaftar pada tanggal itu -> tidak wajib
            const belum = wajibHariIni.filter(s => !sudah.has(s.key)); if (belum.length) rinci.push(g.kelas + ' ' + belum.length + '/' + wajibHariIni.length + ' siswa');
          });
          if (kelasKosong.length) alasan.push('Kelas wajib tanpa data siswa (' + kelasKosong.join(', ') + '): kelengkapan absensi tidak dapat diverifikasi. Bila kelas itu memang tidak ikut sholat, atur "kelas tidak ikut" pada kegiatannya; bila ada siswanya, periksa data siswa');
          if (rinci.length) alasan.push('Absensi siswa belum lengkap (' + rinci.join(', ') + ')');
        }
        const ek = gk + '|' + tgl + '|' + jenis, lolos = alasan.length === 0, e = entri[ek];
        const pengisiHari = [...((((c.pengisi || {})[jenis] || {})[tgl]) || [])];
        // Semua petugas yang check-in pada tanggal+jenis ini (nama), supaya Rekap Petugas QR tidak menandai petugas lain sebagai "pengisi selain petugas".
        const pk = jenis + '|' + tgl, namaPetugas = ci.guruName || honorSholatNamaGuru(gk, gk);
        (petugasHari[pk] || (petugasHari[pk] = [])).includes(namaPetugas) || petugasHari[pk].push(namaPetugas);
        if (!e) entri[ek] = { gk, nama: ci.guruName || gk, tgl, jenis, sistemLolos: lolos, alasanSistem: alasan, lolos, koreksi: null, pengisi: pengisiHari, jumlahCheckin: 1 };
        else {
          // Check-in ganda (guru/hari/jenis sama, mis. dua kegiatan sholat atau scan ulang): GABUNGKAN, jangan menimpa. Pengisi diunion,
          // lolos bila salah satu lolos (pemeriksaan jam & kelengkapan sudah ada di tiap check-in), dan bila semuanya gagal semua alasan dicatat.
          e.jumlahCheckin = (e.jumlahCheckin || 1) + 1;
          pengisiHari.forEach(x => { if (!e.pengisi.includes(x)) e.pengisi.push(x); });
          if (lolos && !e.lolos) { e.sistemLolos = true; e.lolos = true; e.alasanSistem = []; }
          else if (!lolos && !e.lolos) alasan.forEach(a => { if (!e.alasanSistem.includes(a)) e.alasanSistem.push(a); });
        }
        ambil(gk, ci.guruName);
      });
      Object.keys(entri).forEach(ek => { const e = entri[ek]; e.petugas = petugasHari[e.jenis + '|' + e.tgl] || []; });
      // 3) Koreksi Admin: 'Hadir' = dihitung walau sistem menolak / tanpa check-in; 'Tidak Hadir' = dicabut.
      Object.keys(c.koreksi || {}).forEach(k => {
        const kr = c.koreksi[k];
        if (!kr || !kr.tanggal || kr.tanggal < HONOR_SHOLAT_MULAI_CHECKIN || kr.tanggal.slice(0, 7) !== c.ym) return;
        if (kr.sholat !== 'sholat_dluha' && kr.sholat !== 'sholat_dzuhur') return;
        const gk = resolveGk(kr.guruKey, kr.guruName), ek = gk + '|' + kr.tanggal + '|' + kr.sholat;
        const e = entri[ek] || (entri[ek] = { gk, nama: kr.guruName || gk, tgl: kr.tanggal, jenis: kr.sholat, sistemLolos: false, alasanSistem: ['Tidak ada check-in'], lolos: false, koreksi: null });
        e.koreksi = { aksi: kr.aksi, alasan: kr.alasan || '', oleh: kr.oleh || '' };
        e.lolos = kr.aksi === 'Hadir';
        ambil(gk, kr.guruName);
      });
      Object.keys(entri).forEach(ek => {
        const e = entri[ek], g = ambil(e.gk, e.nama);
        if (e.lolos) { if (e.jenis === 'sholat_dluha') g.dluha += 1; else g.dzuhur += 1; }
        else hasil.ditolak.push({ gk: e.gk, nama: g.nama, tgl: e.tgl, jenis: e.jenis, alasan: e.koreksi ? ('Dicabut Admin' + (e.koreksi.alasan ? ': ' + e.koreksi.alasan : '')) : e.alasanSistem.join('; ') });
      });
      hasil.ditolak.sort((a, b) => (a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : COLLATOR_ID.compare(a.nama || '', b.nama || '')));
      return hasil;
    }
    // Ambil data dari server untuk satu bulan lalu hitung. Hasil disimpan di honorSholatCache[ym].
    // Siswa per kelas untuk pemeriksaan kelengkapan. Admin/Kepsek (boleh baca seluruh node siswa, sama seperti bacaSiswaSesuaiScope): SATU
    // pembacaan lalu disaring per kelas, bukan N query paralel. Akun lain tetap per-kelas (Rules membatasi). Di-cache selama HONOR_SHOLAT_TTL_MS
    // supaya ganti bulan / muat ulang tidak membaca ulang.
    let honorSiswaKelasCache = null;   // { at, peta: { kelas: [{key,name,masuk}] } }
    // Tanggal (WIB) siswa ditambahkan ke sistem (field `dibuat`); '' bila tidak diketahui (data lama) -> dianggap sudah ada sejak awal.
    // Dipakai agar siswa yang baru masuk di tengah bulan tidak membuat hari-hari SEBELUM tanggal masuknya dianggap "absensi belum lengkap".
    function honorSiswaMasuk(v) { const ms = Date.parse(v && v.dibuat); return ms > 0 ? honorSholatWib(ms).tgl : ''; }
    function honorSiswaPerKelas(kelasList) {
      const ambilDari = peta => { const o = {}; kelasList.forEach(k => { o[k] = peta[k] || []; }); return o; };
      const c = honorSiswaKelasCache;
      if (c && Date.now() - c.at < HONOR_SHOLAT_TTL_MS && kelasList.every(k => Object.prototype.hasOwnProperty.call(c.peta, k))) return Promise.resolve(ambilDari(c.peta));
      const simpan = peta => {
        const lama = (honorSiswaKelasCache && Date.now() - honorSiswaKelasCache.at < HONOR_SHOLAT_TTL_MS) ? honorSiswaKelasCache.peta : {};
        honorSiswaKelasCache = { at: Date.now(), peta: Object.assign({}, lama, peta) };
        return ambilDari(peta);
      };
      if (isAdmin() || (typeof isKepsek === 'function' && isKepsek())) {
        const perlu = new Set(kelasList);
        return db.ref('siswa').once('value').then(snap => {
          const peta = {}; kelasList.forEach(k => { peta[k] = []; });
          snap.forEach(ch => { const v = ch.val() || {}; if (perlu.has(v.kelas)) peta[v.kelas].push({ key: ch.key, name: v.name || ch.key, masuk: honorSiswaMasuk(v) }); });
          return simpan(peta);
        });
      }
      return Promise.all(kelasList.map(k => db.ref('siswa').orderByChild('kelas').equalTo(k).once('value').then(sn => { const arr = []; sn.forEach(ch => { const v = ch.val() || {}; arr.push({ key: ch.key, name: v.name || ch.key, masuk: honorSiswaMasuk(v) }); }); return [k, arr]; })))
        .then(pasangan => { const peta = {}; pasangan.forEach(x => { peta[x[0]] = x[1]; }); return simpan(peta); });
    }
    function honorSholatMuat(ym) {
      const entry = honorSholatCache[ym];
      const selesai = (err, hasil) => {
        if (honorSholatCache[ym] !== entry) return;   // cache sudah di-invalidate selama memuat
        if (err) { entry.status = 'gagal'; entry.error = (err && err.message) || String(err); } else { entry.status = 'ok'; entry.hasil = hasil; }
        entry.at = Date.now();
        entry.tunggu.splice(0).forEach(cb => { try { cb(); } catch (e) { console.warn('[SI MAMBA] honorSholat callback:', e); } });
      };
      try {
        const religiLama = (allReligiAttendance || []).filter(r => r && r.tanggal && r.tanggal.slice(0, 7) === ym && sesuaiTahunAjaranTermasukDataLama(r));
        const c = { ym, religiLama, checkins: {}, koreksi: {}, hadirSiswa: {}, pengisi: {}, siswaWajib: {}, jenisType: honorSholatJenisType, hariOk: (j, t) => v4HariDiizinkanSholat(j, t) };
        if (ym + '-31' < HONOR_SHOLAT_MULAI_CHECKIN) return selesai(null, honorSholatHitung(c));   // bulan lama: murni Absen Religi lama
        if (typeof db === 'undefined' || !db || !navigator.onLine) return selesai(new Error('Butuh koneksi internet untuk memeriksa check-in petugas dan kelengkapan absensi siswa sholat.'));
        if (!(V4.activityTypes || []).length) { if (typeof v4LoadCore === 'function') v4LoadCore(); return selesai(new Error('Data Amalan Yaumiyah belum termuat. Coba lagi sebentar lagi.')); }
        const jenisList = ['sholat_dluha', 'sholat_dzuhur'], tipe = {}, kelasWajib = {};
        jenisList.forEach(j => {
          tipe[j] = v4CariJenisKegiatanSholat(j === 'sholat_dluha' ? 'Dluha' : 'Dzuhur').map(t => (typeof v4ActTypeByKey === 'function' && v4ActTypeByKey(t.key)) || t);
          kelasWajib[j] = KELAS_LIST.filter(k => tipe[j].some(t => !v4ActKelasTidakIkut(t, k)));
        });
        const awal = ym + '-', akhir = ym + '-\uf8ff';
        const bacaCi = db.ref('activity_checkin_v4').orderByKey().startAt(awal).endAt(akhir).once('value').then(s => { c.checkins = s.val() || {}; });
        const bacaKor = db.ref('honor_koreksi_sholat').orderByKey().startAt(awal).endAt(akhir).once('value').then(s => { c.koreksi = s.val() || {}; });
        const semuaKelas = Array.from(new Set([].concat(kelasWajib.sholat_dluha, kelasWajib.sholat_dzuhur)));
        const bacaSiswa = !HONOR_SHOLAT_WAJIB_ABSENSI_SISWA ? Promise.resolve() : honorSiswaPerKelas(semuaKelas)
          .then(m => {
            jenisList.forEach(j => { c.siswaWajib[j] = kelasWajib[j].map(k => ({ kelas: k, siswa: m[k] || [] })); });
            const kosong = semuaKelas.filter(k => !(m[k] || []).length);
            if (kosong.length) console.warn('[SI MAMBA] Honor sholat: kelas wajib tanpa siswa (' + kosong.join(', ') + ') -> hari sholat ditolak sampai data/pengaturan diperbaiki.');
          });
        const bacaAbsen = Promise.all(jenisList.map(j => Promise.all(tipe[j].map(t => db.ref('activity_attendance_v4').orderByKey().startAt(t.key + '_' + awal).endAt(t.key + '_' + akhir).once('value').then(s => {
          const peta = c.hadirSiswa[j] || (c.hadirSiswa[j] = {});
          s.forEach(ch => {
            const r = ch.val() || {};
            if (!r.studentId || !(typeof v4NormStatusKegiatan === 'function' ? v4NormStatusKegiatan(r.status) : r.status)) return;
            const tgl = r.tanggal || String(ch.key).slice(t.key.length + 1, t.key.length + 11);
            (peta[tgl] || (peta[tgl] = new Set())).add(r.studentId);
            if (r.recordedBy) { const pj = c.pengisi[j] || (c.pengisi[j] = {}); (pj[tgl] || (pj[tgl] = new Set())).add(String(r.recordedBy)); }   // penanda untuk Admin (Rekap Petugas QR)
          });
        })))));
        const batas = new Promise((_, tolak) => setTimeout(() => tolak(new Error('Server belum merespons.')), 30000));
        Promise.race([Promise.all([bacaCi, bacaKor, bacaSiswa, bacaAbsen]), batas])
          .then(() => selesai(null, honorSholatHitung(c)))
          .catch(err => selesai(/permission/i.test((err && err.message) || '') ? new Error('Akses baca ditolak oleh Rules Firebase (activity_checkin_v4 / honor_koreksi_sholat / activity_attendance_v4 / siswa). Minta Admin memasang Rules terbaru.') : err));
      } catch (e) { selesai(e); }
    }
    // { siap:true, hasil } | { siap:false } (sedang memuat; onReady dipanggil saat selesai) | { siap:false, gagal:'pesan' }
    function honorSholatDapat(year, month, onReady) {
      const ym = String(year) + '-' + String(month).padStart(2, '0'), e = honorSholatCache[ym];
      if (e && e.status === 'ok' && Date.now() - e.at < HONOR_SHOLAT_TTL_MS) return { siap: true, hasil: e.hasil };
      if (e && e.status === 'gagal' && Date.now() - e.at < 15000) return { siap: false, gagal: e.error };
      if (e && e.status === 'loading') { if (onReady) e.tunggu.push(onReady); return { siap: false }; }
      honorSholatCache[ym] = { status: 'loading', at: Date.now(), tunggu: onReady ? [onReady] : [] };
      honorSholatMuat(ym);
      const e2 = honorSholatCache[ym];   // bulan lama selesai seketika (sinkron)
      if (e2 && e2.status === 'ok') return { siap: true, hasil: e2.hasil };
      if (e2 && e2.status === 'gagal') return { siap: false, gagal: e2.error };
      return { siap: false };
    }
    function honorSholatStatusHtml(hs, ulang) {
      if (hs.gagal) return `<p style="color:#b91c1c;font-size:13px;">❌ ${escapeHtml(hs.gagal)}</p><button class="btn btn-soft" onclick="honorSholatInvalidate();${ulang}">🔄 Coba lagi</button>`;
      return '<p class="text-muted">⏳ Memeriksa check-in petugas dan kelengkapan absensi siswa sholat...</p>';
    }
    function honorSholatDitolakHtml(daftar, semuaGuru) {
      if (!daftar || !daftar.length) return '';
      const baris = daftar.map(d => `<tr>${semuaGuru ? `<td>${escapeHtml(d.nama)}</td>` : ''}<td>${escapeHtml(d.tgl)}</td><td>${honorSholatNama(d.jenis)}</td><td>${escapeHtml(d.alasan)}</td></tr>`).join('');
      return `<details open style="margin-top:16px;background:#fffbeb;border-radius:12px;padding:12px;border:1px solid #fcd34d;"><summary style="font-weight:700;cursor:pointer;color:#92400e;">⚠️ Hari sholat tidak dihitung honor (${daftar.length})</summary><div style="margin-top:10px;overflow-x:auto;"><table><thead><tr>${semuaGuru ? '<th>Guru</th>' : ''}<th>Tanggal</th><th>Sholat</th><th>Alasan</th></tr></thead><tbody>${baris}</tbody></table></div><p class="text-muted" style="font-size:11px;margin:8px 0 0;">Honor sholat dihitung dari check-in QR petugas yang jamnya dalam jendela sholat${HONOR_SHOLAT_WAJIB_ABSENSI_SISWA ? ' dan absensi siswanya lengkap' : ''}. Untuk koreksi, Admin memakai kartu "Koreksi Absen Religi Guru".</p></details>`;
    }

    // ============================================================
    // HONOR
    // ============================================================
    // ============================================================
    // RATE EKSTRAKURIKULER PER KEGIATAN
    // ============================================================
    // ---- TARIF DEFAULT TERPUSAT ----
    // SATU tempat untuk semua tarif bawaan honor. Dideklarasikan di sini (paling atas dari bagian tarif) karena
    // RATE_EKSTRA_DEFAULT di bawah membacanya saat berkas dimuat (const tidak boleh dipakai sebelum dideklarasikan).
    // ekstra = rate default per jam kegiatan Ekstra/Ekskul yang belum diatur Admin di ekskul_rates/<kegiatan>.
    // kepsek & yayasan = honor TETAP bulanan baris Kepala Madrasah / Ketua Yayasan di rekap Honor.
    const V4_TARIF_DEFAULT = { original: 7000, substitute: 5000, activity: 0, dluha: 5000, dzuhur: 5000, kepsek: 300000, yayasan: 350000, ekstra: 20000 };
    const V4_TARIF_BOLEH_NOL = { activity: 1, kepsek: 1, yayasan: 1 };   // boleh 0 (activity = default acara; kepsek/yayasan 0 = tanpa honor tetap)
    const RATE_EKSTRA_DEFAULT = V4_TARIF_DEFAULT.ekstra;   // nama lama dipertahankan agar berkas lain yang memakainya tidak putus
    // Key Firebase untuk tarif ekskul. Spasi SENGAJA dipertahankan (key lama yang berisi spasi tetap cocok), tetapi dinormalkan:
    // NFKC (huruf lebar penuh/NBSP), karakter kontrol (ilegal di key Firebase) -> spasi, deretan spasi/tab -> satu spasi, lalu trim.
    // Tanpa ini "Bola  Voli", "Bola Voli" dan "Bola<NBSP>Voli" menjadi tiga key berbeda. Nama kosong -> '_' (key tidak boleh kosong).
    function namaKegiatanKey(nama) {
      let t = String(nama == null ? '' : nama);
      try { t = t.normalize('NFKC'); } catch (e) { /* browser lama: lewati */ }
      t = t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_');
      return t || '_';
    }
    // Rumus key LAMA (sebelum normalisasi spasi): hanya cadangan BACA supaya tarif yang sudah tersimpan tidak hilang.
    function namaKegiatanKeyLama(nama) { return String(nama == null ? '' : nama).trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_'); }
    function ekskulRateEntri(nama) {
      const k = namaKegiatanKey(nama);
      if (ekskulRates[k] !== undefined) return ekskulRates[k];
      const lama = namaKegiatanKeyLama(nama);
      return lama !== k ? ekskulRates[lama] : undefined;
    }
    function ekskulRateInputId(nama) { return 'ekskulRateInput_' + encodeURIComponent(namaKegiatanKey(nama)).replace(/%/g, '_'); }
    // Rate default ekskul yang BERLAKU: diatur Admin di "Tarif Honor Terpusat" (honor_rates_v4/ekstra); bila belum
    // diatur / tidak valid / data tarif belum termuat -> RATE_EKSTRA_DEFAULT (bawaan kode).
    function ekskulRateDefault() {
      try { const v = v4GetHonorRates().ekstra; if (v > 0) return v; } catch (e) { /* data tarif belum termuat */ }
      return RATE_EKSTRA_DEFAULT;
    }
    function getEkstraRate(namaKegiatan) {
      if (!namaKegiatan) return ekskulRateDefault();
      const e = ekskulRateEntri(namaKegiatan);
      return (e && e.rate > 0) ? e.rate : ekskulRateDefault();
    }
    function renderEkskulRateList() {
      const container = document.getElementById('ekskulRateList');
      if (!container) return;
      const namaDariJurnal = new Set(allJournals.filter(j => isJamEkstra(j.jam_ke) && j.subject).map(j => j.subject));
      Object.values(ekskulRates).forEach(r => { if (r.nama) namaDariJurnal.add(r.nama); });
      if (namaDariJurnal.size === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada kegiatan ekstrakurikuler tercatat.</p>'; return; }
      let html = '';
      [...namaDariJurnal].sort().forEach(nama => {
        const entri = ekskulRateEntri(nama);
        const rate = entri ? entri.rate : ekskulRateDefault();
        const isDefault = !entri;
        html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="flex:1;min-width:120px;font-weight:600;font-size:13px;">${escapeHtml(nama)} ${isDefault ? '<span class="text-muted" style="font-size:11px;font-weight:400;">(default)</span>' : ''}</span>
          <input type="number" class="field" style="width:130px;padding:4px 8px;" id="${ekskulRateInputId(nama)}" value="${rate}" min="0" step="1000">
          <button class="btn btn-success" style="padding:4px 12px;font-size:12px;" onclick="simpanEkskulRate('${escapeJs(nama)}')">💾</button>
          ${!isDefault ? `<button class="btn btn-danger" style="padding:4px 12px;font-size:12px;" onclick="hapusEkskulRate('${escapeJs(nama)}')">🗑️</button>` : ''}
        </div>`;
      });
      container.innerHTML = html;
    }
    function simpanEkskulRate(nama) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const key = namaKegiatanKey(nama);
      const input = document.getElementById(ekskulRateInputId(nama));
      if (!input) return toast('Kolom rate tidak ditemukan — muat ulang tab Tarif & Ekskul.', true);
      const rate = parseInt(input.value) || 0;
      if (rate < 0) return toast('Rate tidak valid!', true);
      db.ref('ekskul_rates/' + key).set({ nama, rate, tahunAjaran: currentTahunAjaran, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ Rate "${nama}" diperbarui ke Rp ${rate.toLocaleString()}/jam!`); addLog('ubah_rate_ekskul', nama + ': Rp ' + rate);
        reloadDataset('ekskulRates', () => { renderEkskulRateList(); renderHonor(); });
      });
    }
    function hapusEkskulRate(nama) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const key = namaKegiatanKey(nama);
      if (!confirm(`Kembalikan "${nama}" ke rate default (Rp ${ekskulRateDefault().toLocaleString()}/jam)?`)) return;
      const lama = namaKegiatanKeyLama(nama), hapusLama = (lama !== key && ekskulRates[lama] !== undefined) ? db.ref('ekskul_rates/' + lama).remove() : Promise.resolve();
      Promise.all([db.ref('ekskul_rates/' + key).remove(), hapusLama]).then(() => {
        toast('✅ Rate dikembalikan ke default.'); addLog('hapus_rate_ekskul', nama); reloadDataset('ekskulRates', () => { renderEkskulRateList(); renderHonor(); });
      }).catch(err => toast('Gagal: ' + (err && err.message || err), true));
    }
    function tambahEkskulRate() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const nama = document.getElementById('ekskulRateNamaBaru').value.trim();
      const rate = parseInt(document.getElementById('ekskulRateNilaiBaru').value) || 0;
      if (!nama) return toast('Isi nama kegiatan!', true);
      if (rate <= 0) return toast('Isi rate lebih dari 0!', true);
      const key = namaKegiatanKey(nama);
      db.ref('ekskul_rates/' + key).set({ nama, rate, tahunAjaran: currentTahunAjaran, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ Kegiatan "${nama}" ditambahkan dengan rate Rp ${rate.toLocaleString()}/jam!`); addLog('tambah_rate_ekskul', nama);
        document.getElementById('ekskulRateNamaBaru').value = ''; document.getElementById('ekskulRateNilaiBaru').value = '';
        reloadDataset('ekskulRates', () => { renderEkskulRateList(); renderHonor(); });
      });
    }

    // ============================================================
    // GURU TERAJIN (ranking kedisiplinan otomatis + honor fleksibel)
    // ============================================================
    let allGuruTerajin = {};
    // Kumpulan tanggal LIBUR dari Kalender Akademik (jenis 'libur'; rentang mulai-selesai diperluas per hari).
    // Dipakai agar Alpha otomatis di hari libur tidak memotong skor guru. Tanggal diambil dari semua isian
    // berformat YYYY-MM-DD pada entri libur (terkecil = mulai, terbesar = selesai) sehingga tidak bergantung nama field.
    function tanggalLiburKalender() {
      const out = new Set();
      const sumber = (typeof allKalenderAkademik !== 'undefined' && allKalenderAkademik) ? allKalenderAkademik : [];
      const daftar = Array.isArray(sumber) ? sumber : Object.values(sumber);
      daftar.forEach(e => {
        if (!e || typeof e !== 'object') return;
        if (String(e.jenis || e.tipe || e.type || '').toLowerCase() !== 'libur') return;
        const tgls = Object.values(e).filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)).map(v => v.slice(0, 10)).sort();
        if (!tgls.length) return;
        let cur = tgls[0]; const akhir = tgls[tgls.length - 1];
        for (let i = 0; i < 400 && cur <= akhir; i++) { // pengaman 400 hari
          out.add(cur);
          const x = new Date(cur + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); cur = x.toISOString().slice(0, 10);
        }
      });
      return out;
    }
    let _terajinKalenderDicoba = false;
    // Ranking butuh Jadwal (Alpha hanya di hari berjadwal, mewakili di hari tanpa jadwal). Kalau Jadwal belum terbaca
    // (kosong karena gagal dimuat/timeout/belum diisi), ranking TIDAK dihitung supaya tidak menghasilkan juara yang salah.
    let _terajinJadwalDicoba = false;
    // Alpha otomatis hanya ditulis saat Admin membuka aplikasi (hari-hari SEBELUM hari ini). Maka ranking bisa belum final bila:
    // (a) bulan itu belum berakhir, atau (b) pengecekan Alpha di perangkat ini belum menjangkau akhir bulan. Mengembalikan teks peringatan atau ''.
    function terajinPeringatanBulan(month, year) {
      const m = parseInt(month, 10), y = parseInt(year, 10);
      if (!m || !y) return '';
      const akhir = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // tanggal terakhir bulan tsb
      if (tglLokal() <= akhir) return 'Bulan ini belum selesai (sampai ' + akhir + '): Alpha hari-hari berikutnya belum tercatat, jadi ranking masih SEMENTARA.';
      let lastCheck = null; try { lastCheck = localStorage.getItem('alphaCheckLastDate'); } catch (e) {}
      if (!lastCheck || lastCheck < akhir) return 'Pengecekan Alpha otomatis di perangkat ini baru sampai ' + (lastCheck || '(belum pernah)') + ', sedangkan bulan ini berakhir ' + akhir + ': Alpha di hari-hari terakhir mungkin belum tercatat. Muat ulang halaman sebagai Admin lalu buka tab ini lagi (atau pastikan Admin lain sudah membuka aplikasi).';
      return '';
    }
    function terajinJadwalSiap() { return Array.isArray(allJadwal) && allJadwal.length > 0; }
    function terajinMuatUlangJadwal() {
      if (!db) return toast('Database belum siap.', true);
      if (!navigator.onLine) return toast('Sedang offline — jadwal tidak bisa dimuat ulang.', true);
      _terajinJadwalDicoba = true; // satu kali percobaan per klik; hasilnya langsung ditampilkan
      const box = document.getElementById('guruTerajinRanking');
      if (box) box.innerHTML = '<p class="text-muted" style="font-size:13px;">⏳ Memuat jadwal…</p>';
      db.ref('jadwal').once('value', snap => {
        const baru = []; snap.forEach(child => { const j = child.val(); if (j && typeof j === 'object') { j.key = child.key; baru.push(j); } });
        if (baru.length) allJadwal = baru;
        renderGuruTerajinRanking();
      }, err => { toast('Gagal memuat jadwal: ' + (err && err.message ? err.message : err), true); renderGuruTerajinRanking(); });
    }
    function hitungRankingKedisiplinan(month, year) {
      const monthStr = String(month).padStart(2,'0');
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      const winDatang = getJamAbsenWindow('Datang');
      const toMenit = (str) => { const p = str.split(':'); return parseInt(p[0])*60 + parseInt(p[1]); };
      const datangSelesai = toMenit(winDatang.selesai);
      const POIN_MEWAKILI_TANPA_JADWAL = 2; // sama dengan 1 hari Datang tepat waktu
      const NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const hariDari = (tgl) => NAMA_HARI[new Date(tgl + 'T00:00:00Z').getUTCDay()];
      const normHari = (h) => String(h || '').trim().toLowerCase();
      const jurnalBulanIni = (typeof allJournals !== 'undefined' ? allJournals : []).filter(j => { if (!j || !j.tanggal) return false; const parts = j.tanggal.split('-'); return parts[0] === String(year) && parts[1] === monthStr; });
      const BATAS_DATANG_AWAL = 7 * 60; // bonus +1 untuk Datang tepat waktu SEBELUM pukul 07:00 WIB
      const todayStr = tglLokal();
      const hariLibur = tanggalLiburKalender();
      const recsBulanIni = allTeacherAttendance.filter(a => { if (!a.tanggal) return false; const parts = a.tanggal.split('-'); return parts[0] === String(year) && parts[1] === monthStr; });
      // Pencocokan catatan -> guru: lewat guruKey bila ada. Nama dipakai HANYA untuk catatan lama tanpa guruKey,
      // dan dibandingkan lewat samaNamaGuru() supaya "S.Pd." vs "S.Pd" (titik/koma/spasi) tidak membuat guru
      // kehilangan seluruh poinnya.
      const milikGuru = (a, g) => (a.guruKey ? (!!g.key && a.guruKey === g.key) : samaNamaGuru(a.guru, g.name));
      // "Tepat waktu" = tiba paling lambat batas akhir jendela Datang. Datang lebih awal dari jam mulai jendela
      // TETAP tepat (scan QR juga hanya menandai telat bila lewat batas akhir). Catatan yang sudah bertanda
      // "Telat ..." tidak dihitung tepat. Koreksi manual Admin tanpa jam (tersimpan 00:00) = hadir saja,
      // tidak menambah poin tepat waktu karena jam tibanya memang tidak diketahui.
      const tepatWaktu = (a) => {
        if (/^\s*telat/i.test(String(a.keterangan || ''))) return 0;
        const ms = waktuMs(a.waktu);
        if (!isFinite(ms)) return 0;
        const menit = menitWIB(new Date(ms)); // WIB, bukan jam perangkat (waktu bisa epoch-ms atau string ISO)
        if (a.metode === 'manual_admin' && menit === 0) return 0;
        if (menit > datangSelesai) return 0;
        return menit < BATAS_DATANG_AWAL ? 2 : 1;
      };
      const semuaGuruRank = guruAktif.map(g => {
        const recs = recsBulanIni.filter(a => milikGuru(a, g));
        let datangTepat = 0, datangAwal = 0, alpha = 0, hadirHari = 0, mewakiliTanpaJadwal = 0;
        // Hari-hari dalam seminggu yang MEMANG ada jadwal mengajar guru ini. Alpha hanya dihitung di hari berjadwal;
        // guru tanpa jadwal sama sekali tidak pernah kena potongan Alpha.
        const hariBerjadwal = new Set((allJadwal || []).filter(j => j && (j.guruKey ? (!!g.key && j.guruKey === g.key) : samaNamaGuru(j.guru, g.name))).map(j => normHari(j.hari)));
        // Satu hari dihitung SEKALI walau (karena data lama/koreksi) ada lebih dari satu catatan Datang.
        const hariDatang = new Set(), hariAlpha = new Set(), hariTepat = new Set(), hariAwal = new Set();
        recs.forEach(a => {
          if (a.type === 'Alpha') hariAlpha.add(a.tanggal);
          if (a.type === 'Datang') { hariDatang.add(a.tanggal); const st = tepatWaktu(a); if (st >= 1) hariTepat.add(a.tanggal); if (st === 2) hariAwal.add(a.tanggal); }
        });
        // Hari yang sudah ada catatan Datang tidak bisa sekaligus Alpha (sisa Alpha otomatis sebelum dikoreksi).
        hariAlpha.forEach(t => { if (!hariDatang.has(t) && !hariLibur.has(t) && hariBerjadwal.has(normHari(hariDari(t)))) alpha++; }); // Alpha tidak dihitung di hari libur kalender & hari tanpa jadwal guru
        // Mewakili guru lain (jurnal Non-Reguler berstatus bukan ditolak/menunggu) di hari yang guru ini TIDAK ada jadwal = poin tambahan,
        // dihitung sekali per tanggal.
        const hariMewakili = new Set();
        jurnalBulanIni.forEach(j => {
          if (j.type !== 'Non-Reguler' || !j.mewakili) return;
          if (j.status === 'ditolak' || j.status === 'pending') return;
          const milik = j.guruKey ? (!!g.key && j.guruKey === g.key) : samaNamaGuru(j.guru, g.name);
          if (milik && !hariBerjadwal.has(normHari(hariDari(j.tanggal)))) hariMewakili.add(j.tanggal);
        });
        mewakiliTanpaJadwal = hariMewakili.size;
        datangTepat = hariTepat.size;
        hariAwal.forEach(t => { if (hariTepat.has(t)) datangAwal++; });
        hadirHari = hariDatang.size;
        // Hari-hari guru ini sudah Absen Datang tapi TIDAK PERNAH Absen Pulang di tanggal yang
        // sama -- dikecualikan hari INI (todayStr), karena guru yang absen ranking sedang dihitung
        // hari ini mungkin memang belum waktunya pulang, bukan berarti dia lalai.
        let tanpaPulang = 0;
        hariDatang.forEach(tgl => {
          if (tgl === todayStr) return;
          const sudahPulang = recs.some(a => a.type === 'Pulang' && a.tanggal === tgl);
          if (!sudahPulang) tanpaPulang++;
        });
        const skor = (datangTepat * 2) + datangAwal + (mewakiliTanpaJadwal * POIN_MEWAKILI_TANPA_JADWAL) - (alpha * 5) - (tanpaPulang * 2);
        return { guru: g.name, guruKey: g.key || null, datangTepat, datangAwal, mewakiliTanpaJadwal, alpha, hadirHari, tanpaPulang, skor };
      });
      // Yang punya catatan masuk peringkat; yang belum punya catatan sama sekali bulan ini dikembalikan terpisah (ranking.tanpaData)
      // supaya SEMUA guru tampil di daftar, tetapi tidak ikut diberi nomor peringkat / pilihan penetapan Guru Terajin.
      const adaCatatan = r => r.hadirHari > 0 || r.alpha > 0 || r.mewakiliTanpaJadwal > 0;
      const ranking = semuaGuruRank.filter(adaCatatan);
      ranking.tanpaData = semuaGuruRank.filter(r => !adaCatatan(r)).map(r => r.guru).sort((a, b) => String(a).localeCompare(String(b), 'id'));
      // Urutan: skor tertinggi; bila sama -> alpha paling sedikit, tanpa-pulang paling sedikit,
      // datang tepat paling banyak, hadir paling banyak, terakhir nama (supaya urutan stabil).
      ranking.sort((a,b) => (b.skor - a.skor) || (a.alpha - b.alpha) || (a.tanpaPulang - b.tanpaPulang) || (b.datangTepat - a.datangTepat) || (b.datangAwal - a.datangAwal) || (b.mewakiliTanpaJadwal - a.mewakiliTanpaJadwal) || (b.hadirHari - a.hadirHari) || String(a.guru).localeCompare(String(b.guru), 'id'));
      // Peringkat kompetisi: yang benar-benar seri di semua kriteria berbagi nomor yang sama.
      let rankSaatIni = 0;
      ranking.forEach((r, i) => {
        const p = ranking[i-1];
        const sama = p && p.skor === r.skor && p.alpha === r.alpha && p.tanpaPulang === r.tanpaPulang && p.datangTepat === r.datangTepat && p.datangAwal === r.datangAwal && p.mewakiliTanpaJadwal === r.mewakiliTanpaJadwal && p.hadirHari === r.hadirHari;
        if (!sama) rankSaatIni = i + 1;
        r.rank = rankSaatIni;
      });
      return ranking;
    }
    function renderGuruTerajinRanking() {
      // Kalender Akademik dimuat malas (lazy); muat sekali dulu supaya hari libur ikut dikecualikan dari Alpha.
      if (!_terajinKalenderDicoba && typeof lazyLoadedSet !== 'undefined' && !lazyLoadedSet.has('kalenderAkademik') && typeof ensureLazyDatasets === 'function') {
        _terajinKalenderDicoba = true;
        ensureLazyDatasets(['kalenderAkademik'], () => renderGuruTerajinRanking());
        return;
      }
      const month = document.getElementById('honorMonth').value, year = document.getElementById('honorYear').value;
      const container = document.getElementById('guruTerajinRanking');
      if (!terajinJadwalSiap()) {
        if (!_terajinJadwalDicoba && navigator.onLine) { terajinMuatUlangJadwal(); return; } // otomatis coba muat sekali
        document.getElementById('guruTerajinSetForm').style.display = 'none';
        container.innerHTML = '<div style="padding:12px;background:#fef3c7;border-radius:12px;font-size:13px;color:#92400e;">⚠️ <strong>Jadwal belum terbaca atau masih kosong</strong>, jadi ranking belum dihitung agar hasilnya tidak salah (Alpha hanya berlaku di hari berjadwal). Pastikan menu Jadwal sudah terisi dan koneksi aktif.<div style="margin-top:8px;"><button type="button" class="btn btn-soft" onclick="terajinMuatUlangJadwal()">🔄 Muat ulang jadwal</button></div></div>';
        const doneBox0 = document.getElementById('guruTerajinSudahDitetapkan'), sudah0 = allGuruTerajin[year + '-' + String(month).padStart(2,'0')];
        if (sudah0) { doneBox0.style.display = 'block'; doneBox0.innerHTML = `✅ <strong>${escapeHtml(sudah0.guru)}</strong> ditetapkan sebagai Guru Terajin bulan ini — Honor: Rp ${(sudah0.honor||0).toLocaleString()}`; } else { doneBox0.style.display = 'none'; }
        return;
      }
      const ranking = hitungRankingKedisiplinan(month, year);
      const key = year + '-' + String(month).padStart(2,'0');
      const sudahDitetapkan = allGuruTerajin[key];
      if (ranking.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data absen guru bulan ini.</p>'; document.getElementById('guruTerajinSetForm').style.display = 'none'; document.getElementById('guruTerajinSudahDitetapkan').style.display = 'none'; return; }
      let html = '<div style="overflow-x:auto;"><table style="font-size:12px;"><thead><tr><th>Rank</th><th>Nama</th><th>Datang Tepat Waktu</th><th>Sebelum 07.00</th><th>Mewakili (tanpa jadwal)</th><th>Alpha</th><th>Tanpa Pulang</th><th>Skor</th></tr></thead><tbody>';
      // Tampilkan SEMUA guru (dulu hanya 5 teratas).
      ranking.forEach(r => {
        const medali = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank;
        html += `<tr ${r.rank===1 ? 'style="background:#fef3c7;font-weight:600;"' : ''}><td>${medali}</td><td>${escapeHtml(r.guru)}</td><td>${r.datangTepat}x</td><td>${r.datangAwal}x</td><td>${r.mewakiliTanpaJadwal}x</td><td>${r.alpha}x</td><td>${r.tanpaPulang}x</td><td>${r.skor}</td></tr>`;
      });
      (ranking.tanpaData || []).forEach(nm => {
        html += `<tr style="color:#9ca3af;"><td>–</td><td>${escapeHtml(nm)} <span style="font-size:11px;">(belum ada absen)</span></td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td></tr>`;
      });
      html += '</tbody></table></div>';
      const prefiks = year + '-' + String(month).padStart(2,'0') + '-';
      const jmlLibur = [...tanggalLiburKalender()].filter(t => t.startsWith(prefiks) && new Date(t + 'T00:00:00Z').getUTCDay() !== 0).length;
      html += '<p class="text-muted" style="font-size:11px;margin-top:6px;">Skor: tepat waktu +2, sebelum 07.00 +1, mewakili di hari tanpa jadwal +2, Alpha −5, tanpa absen pulang −2. Alpha hanya dihitung di hari guru punya jadwal.' + (jmlLibur ? ' Alpha pada ' + jmlLibur + ' hari libur Kalender Akademik bulan ini tidak dihitung.' : '') + '</p>';
      const peringatan = terajinPeringatanBulan(month, year);
      if (peringatan) html += '<div style="margin-top:8px;padding:10px 12px;background:#fef3c7;border-radius:10px;font-size:12px;color:#92400e;">⏳ ' + escapeHtml(peringatan) + '</div>';
      container.innerHTML = html;
      if (!isAdmin()) { document.getElementById('guruTerajinSetForm').style.display = 'none'; }
      else {
        const setForm = document.getElementById('guruTerajinSetForm');
        setForm.style.display = 'block';
        const select = document.getElementById('guruTerajinPilih');
        select.innerHTML = ranking.map(r => `<option value="${escapeHtml(r.guruKey || r.guru)}">${escapeHtml(r.guru)} (Skor: ${r.skor})</option>`).join('');
      }
      const doneBox = document.getElementById('guruTerajinSudahDitetapkan');
      if (sudahDitetapkan) {
        doneBox.style.display = 'block';
        doneBox.innerHTML = `✅ <strong>${escapeHtml(sudahDitetapkan.guru)}</strong> ditetapkan sebagai Guru Terajin bulan ini — Honor: Rp ${(sudahDitetapkan.honor||0).toLocaleString()} <span style="font-size:11px;color:#065f46;">(oleh ${escapeHtml(sudahDitetapkan.ditetapkanOleh||'-')})</span>`;
      } else { doneBox.style.display = 'none'; }
    }
    function tetapkanGuruTerajin() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!terajinJadwalSiap()) return toast('Jadwal belum terbaca — ranking belum akurat. Klik "Muat ulang jadwal" dulu.', true);
      const month = document.getElementById('honorMonth').value, year = document.getElementById('honorYear').value;
      const pilihan = document.getElementById('guruTerajinPilih').value;
      const honor = parseInt(document.getElementById('guruTerajinHonor').value) || 0;
      if (!pilihan) return toast('Pilih guru terlebih dahulu!', true);
      const dipilih = hitungRankingKedisiplinan(month, year).find(r => (r.guruKey || r.guru) === pilihan);
      if (!dipilih) return toast('Guru tidak ditemukan di ranking bulan ini. Muat ulang halaman lalu coba lagi.', true);
      const guru = dipilih.guru, guruKey = dipilih.guruKey || null;
      if (honor <= 0) return toast('Isi honor terlebih dahulu!', true);
      const key = year + '-' + String(month).padStart(2,'0');
      const peringatan = terajinPeringatanBulan(month, year);
      if (peringatan && !confirm('⏳ Ranking bulan ini belum final.\n\n' + peringatan + '\n\nTetap tetapkan ' + guru + ' sebagai Guru Terajin sekarang?')) return;
      const lama = allGuruTerajin[key];
      if (lama && !confirm(`Bulan ini sudah ada Guru Terajin: ${lama.guru} (Rp ${(lama.honor||0).toLocaleString('id-ID')}).\n\nGanti menjadi ${guru} (Rp ${honor.toLocaleString('id-ID')})?\n\nBonus ${lama.guru} di Honor & Slip bulan ini akan hilang.`)) return;
      db.ref('guru_terajin/' + key).set({ guru, guruKey, honor, tahunAjaran: currentTahunAjaran, ditetapkanOleh: currentUser.name, ditetapkanAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`🏆 ${guru} ditetapkan sebagai Guru Terajin!`); addLog('tetapkan_guru_terajin', guru + ' - ' + key);
        document.getElementById('guruTerajinHonor').value = '';
        reloadDataset('guruTerajin', () => { renderGuruTerajinRanking(); renderHonor(); });
      });
    }
    // -------- Honor: rate & rumus terpusat --------
    // SATU sumber kebenaran untuk rate & rumus honor, dipakai bersama oleh renderHonor,
    // renderHonorSlip, downloadHonorPDF, dan generateHonorReport (sebelumnya rumus yang sama
    // di-copy-paste 4x -- risiko salah satu kelewat kalau nanti rumus/rate berubah).
    // kepsek & yayasan = honor TETAP bulanan baris Kepala Madrasah / Ketua Yayasan di rekap Honor (dulu angka 300000/350000 ditulis langsung di kode)
    // (V4_TARIF_DEFAULT & V4_TARIF_BOLEH_NOL dipindah ke atas berkas ini, di bagian "TARIF DEFAULT TERPUSAT".)
    // Menormalkan isi honor_rates_v4: nilai harus angka hingga (>0; khusus `activity` boleh 0). Yang tidak valid
    // (0, kosong, teks, NEGATIF) diganti tarif default -- dulu 0 diam-diam jatuh ke default lewat `||`, tapi
    // nilai NEGATIF lolos & memotong honor. `rusak` = field yang ADA di database tapi tidak valid (field yang
    // memang belum pernah disimpan bukan "rusak", cukup memakai default).
    function v4NormalisasiRates(raw) {
      const src = raw && typeof raw === 'object' ? raw : {}, rates = {}, rusak = [];
      Object.keys(V4_TARIF_DEFAULT).forEach(k => {
        const v = src[k];
        let n = NaN;
        if (typeof v === 'number') n = v; else if (typeof v === 'string' && v.trim() !== '') n = Number(v);
        const valid = isFinite(n) && (V4_TARIF_BOLEH_NOL[k] ? n >= 0 : n > 0);
        if (valid) rates[k] = n;
        else { rates[k] = V4_TARIF_DEFAULT[k]; if (v !== undefined && v !== null) rusak.push(k); }
      });
      if (src.updatedBy !== undefined) rates.updatedBy = src.updatedBy;
      if (src.updatedAt !== undefined) rates.updatedAt = src.updatedAt;
      return { rates, rusak };
    }
    // Perbaikan sekali per sesi (hanya Admin): tulis balik tarif yang efektif dipakai ke database, supaya isi
    // database = perilaku hitung honor & form Pengaturan Tarif. Tidak mengubah nominal yang valid.
    let v4TarifDiperbaikiSesiIni = false;
    // Node yang dikunci "hanya sesi Admin" di Rules (honor_rates_v4, rapat, Dinas Luar Kepala): pastikan sesi_admin/{uid} terisi
    // sebelum menulis. Memakai kredAdminSiap() dari js/kredensial.js; bila modul itu tak ada, lanjut (Rules lama tidak mengunci).
    let adminSesiModulHilangDicatat = false;
    function adminSesi() {
      if (typeof window.kredAdminSiap === 'function') return window.kredAdminSiap();
      if (!adminSesiModulHilangDicatat) { adminSesiModulHilangDicatat = true; console.warn('[SI MAMBA] js/kredensial.js (kredAdminSiap) tidak termuat: sesi Admin tidak disiapkan sebelum menulis. Rules Firebase tetap menolak bila sesi Admin diwajibkan.'); }
      return Promise.resolve(true);
    }
    // Pesan galat tulis yang jelas untuk Admin: penolakan Rules (PERMISSION_DENIED) = sesi Admin belum aktif, bukan "gagal" umum.
    function honorPesanGagalTulis(err, aksi) {
      const msg = (err && err.message) || String(err || ''), judul = aksi || 'Gagal menyimpan';
      if ((err && err.code === 'PERMISSION_DENIED') || /permission[_ ]denied|permission/i.test(msg)) {
        return judul + ': ditolak server karena sesi Admin belum aktif. ' + (typeof window.kredAdminSiap === 'function'
          ? 'Muat ulang halaman atau login ulang sebagai Admin, lalu coba lagi.'
          : 'Modul kredensial (js/kredensial.js) tidak termuat — muat ulang halaman; bila berulang, hubungi pengelola aplikasi.');
      }
      return judul + ': ' + msg;
    }
    function v4PerbaikiTarifRusak(rusak, ratesValid, rawLama) {
      if (v4TarifDiperbaikiSesiIni || !isAdmin() || !rusak.length) return;
      v4TarifDiperbaikiSesiIni = true;
      const patch = { perbaikanTarifAt: new Date().toISOString() }, lama = {};
      rusak.forEach(k => { patch[k] = ratesValid[k]; lama[k] = rawLama[k]; });
      adminSesi().then(() => db.ref('honor_rates_v4').update(patch)).then(() => {
        v4Audit('REPAIR_HONOR_RATES', 'HONOR_RATE', 'global', lama, patch);
        toast(`⚠️ Tarif honor tidak valid di database (${rusak.join(', ')}) dipulihkan ke tarif yang berlaku. Periksa di Pengaturan Tarif.`, true, 7000);
      }).catch(err => console.warn('[SI MAMBA] Gagal memperbaiki tarif honor:', err && err.message || err));
    }
    function v4GetHonorRates(){
      const r = v4NormalisasiRates(V4.rates).rates;
      return { reguler: r.original, nonReguler: r.substitute, dluha: r.dluha, dzuhur: r.dzuhur, kepsek: r.kepsek, yayasan: r.yayasan, ekstra: r.ekstra };
    }
    // b = breakdown honor satu guru: {reguler, nonReguler, ekstraHonor, dluha, dzuhur, eventHonor,
    // ujianHonor, tunjangan, transport} -- field yang tidak diisi dianggap 0. rates opsional,
    // default ambil dari v4GetHonorRates() (tarif yang diatur Admin di halaman Honor).
    function v4HitungHonor(b, rates){
      rates = rates || v4GetHonorRates();
      const reguler=b.reguler||0, nonReguler=b.nonReguler||0, ekstraHonor=b.ekstraHonor||0,
            dluha=b.dluha||0, dzuhur=b.dzuhur||0, eventHonor=b.eventHonor||0, ujianHonor=b.ujianHonor||0,
            tunjangan=b.tunjangan||0, transport=b.transport||0;
      return reguler*rates.reguler + nonReguler*rates.nonReguler + ekstraHonor + dluha*rates.dluha + dzuhur*rates.dzuhur + eventHonor + ujianHonor + tunjangan + transport;
    }

    // ---- Pengelompokan & agregasi honor per guru: SATU sumber untuk renderHonor, renderHonorSlip, honorPdfBuat dan
    // generateHonorReport (js/laporan-rekap.js). Dulu kunci guru, penjumlahan, dan rumus honor di-copy-paste di tiap tempat. ----
    // sumber = { journals, events, ujian, ekskulPic, religiPerGuru } -- semuanya SUDAH disaring periode & tahun ajaran (& guru, untuk slip).
    // Kunci grup = guruKey lewat honorBuatResolver() (sama untuk semua sumber supaya satu guru tidak pecah jadi 2 baris).
    // Honor "Dinas Luar Kepala" (event dengan guruKey 'kepsek') TIDAK jadi baris guru: dijumlahkan di dlKepala.
    function honorKelompokkan(sumber) {
      const resolveGuruKey = honorBuatResolver();
      const groupedJurnal = {}, groupedEvents = {}, groupedUjian = {}, groupedEkskulPic = {}, dlKepala = { jumlah: 0, honor: 0 };
      const tambahHonor = (peta, rec) => { const gk = resolveGuruKey(rec.guruKey, rec.guru); const g = peta[gk] || (peta[gk] = { nama: rec.guru, jumlah: 0, honor: 0 }); g.jumlah += 1; g.honor += (rec.honor || 0); };
      (sumber.journals || []).forEach(j => {
        const gk = resolveGuruKey(j.guruKey, j.guru);
        const g = groupedJurnal[gk] || (groupedJurnal[gk] = { nama: j.guru, reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 });
        if (isJamEkstra(j.jam_ke)) { g.ekstra += 1; g.ekstraHonor += getEkstraRate(j.subject); } else if (j.type === 'Non-Reguler') g.nonReguler += 1; else g.reguler += 1;
      });
      (sumber.events || []).forEach(e => { if (e.guruKey === 'kepsek') { dlKepala.jumlah += 1; dlKepala.honor += (e.honor || 0); return; } tambahHonor(groupedEvents, e); });
      (sumber.ujian || []).forEach(u => tambahHonor(groupedUjian, u));
      (sumber.ekskulPic || []).forEach(x => tambahHonor(groupedEkskulPic, x));
      return { groupedJurnal, groupedReligi: sumber.religiPerGuru || {}, groupedEvents, groupedUjian, groupedEkskulPic, dlKepala };
    }
    // Guru yang mendapat tunjangan/transport tetap (muncul di rekap walau tanpa jurnal bulan itu).
    function honorGuruBertunjangan() {
      return (allGuru || []).filter(g => (g.role === 'guru' || g.role === 'wali_kelas') && ((g.tunjanganMasaKerja||0) > 0 || (g.bantuanTransportasi||0) > 0));
    }
    // Himpunan kunci guru yang punya baris di rekap (urutan tampil mengikuti urutan penyisipan).
    function honorKunciGuru(grup, guruBertunjangan) {
      return new Set([...Object.keys(grup.groupedJurnal), ...Object.keys(grup.groupedReligi), ...Object.keys(grup.groupedEvents), ...Object.keys(grup.groupedUjian), ...Object.keys(grup.groupedEkskulPic), ...(guruBertunjangan || []).map(g => g.key || g.name)]);
    }
    // Rincian + total honor SATU guru. ekstraHonor = jurnal "Ekstra" + kredit otomatis PIC/pengganti ekskul (v4SaveEkskulAttendance).
    // namaCadangan (opsional) = nama untuk mencari data guru bila key tidak ketemu di allGuru (dipakai Slip Honor Saya).
    function honorRincianGuru(guruKey, grup, rates, namaCadangan) {
      const j = grup.groupedJurnal[guruKey] || { reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 }, r = grup.groupedReligi[guruKey] || { dluha: 0, dzuhur: 0 },
            ev = grup.groupedEvents[guruKey] || { jumlah: 0, honor: 0 }, uj = grup.groupedUjian[guruKey] || { jumlah: 0, honor: 0 }, ekpic = grup.groupedEkskulPic[guruKey] || { jumlah: 0, honor: 0 };
      const guruObj = (allGuru || []).find(g => g.key === guruKey) || (allGuru || []).find(g => g.name === guruKey) || (namaCadangan ? (allGuru || []).find(g => g.name === namaCadangan) : null) || null;
      const guru = j.nama || r.nama || ev.nama || uj.nama || ekpic.nama || (guruObj && guruObj.name) || guruKey;
      const tunjangan = (guruObj && guruObj.tunjanganMasaKerja) || 0, transport = (guruObj && guruObj.bantuanTransportasi) || 0;
      const ekstraHonor = j.ekstraHonor + ekpic.honor;
      const honor = v4HitungHonor({ reguler: j.reguler, nonReguler: j.nonReguler, ekstraHonor, dluha: r.dluha, dzuhur: r.dzuhur, eventHonor: ev.honor, ujianHonor: uj.honor, tunjangan, transport }, rates);
      return { guruKey, guru, j, r, ev, uj, ekpic, tunjangan, transport, ekstraHonor, honor };
    }
    // ---- Tab halaman Honor: memecah hasil rekap supaya tidak perlu menggulir panjang ----
    let honorTabAktif = 'rekap';   // tetap dipakai saat renderHonor() dipanggil ulang (mis. setelah catat panjar)
    function honorTabCss() {
      if (document.getElementById('honorTabCss')) return;
      const st = document.createElement('style'); st.id = 'honorTabCss';
      st.textContent = '.honor-tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:2px solid #e5e7eb;margin-bottom:14px;}'
        + '.honor-tab-btn{border:0;background:transparent;padding:9px 14px;font-weight:600;font-size:14px;cursor:pointer;color:#6b7280;border-bottom:3px solid transparent;margin-bottom:-2px;border-radius:8px 8px 0 0;}'
        + '.honor-tab-btn:hover{background:#f3f4f6;}'
        + '.honor-tab-btn.aktif{color:#059669;border-bottom-color:#059669;}'
        + '.honor-tab-badge{display:inline-block;min-width:18px;padding:0 6px;margin-left:5px;border-radius:999px;background:#fde68a;color:#92400e;font-size:11px;line-height:18px;text-align:center;}'
        + '.honor-tab-panel{display:none;}.honor-tab-panel.aktif{display:block;}';
      document.head.appendChild(st);
    }
    function honorTabPilih(id) {
      honorTabAktif = id;
      const root = document.getElementById('honorResult'); if (!root) return;
      root.querySelectorAll('.honor-tab-btn').forEach(b => b.classList.toggle('aktif', b.getAttribute('data-tab') === id));
      root.querySelectorAll('.honor-tab-panel').forEach(p => p.classList.toggle('aktif', p.getAttribute('data-tab') === id));
    }
    // Tab tingkat halaman Honor (Rekap / Rate Ekskul / Guru Terajin): menampilkan satu kartu pada satu waktu.
    function honorMenuTab(id) {
      honorTabCss();
      document.querySelectorAll('#honorMenuTabs .honor-tab-btn').forEach(b => b.classList.toggle('aktif', b.getAttribute('data-menutab') === id));
      document.querySelectorAll('#page-honor .card[data-menutab]').forEach(c => { c.style.display = c.getAttribute('data-menutab') === id ? '' : 'none'; });
      // Render kartu hanya saat tab-nya dibuka (bukan tiap renderHonor), memakai Bulan/Tahun yang sedang dipilih.
      try { if (id === 'ekskul') renderEkskulRateList(); else if (id === 'terajin') renderGuruTerajinRanking(); } catch (e) { console.warn('[SI MAMBA] honorMenuTab:', e); }
    }
    // tabs: [{ id, label, html, badge? }] -- tab dengan html kosong dilewati.
    function honorTabBungkus(tabs) {
      honorTabCss();
      const ada = tabs.filter(t => t && t.html);
      const aktif = ada.some(t => t.id === honorTabAktif) ? honorTabAktif : (ada[0] ? ada[0].id : '');
      const bar = ada.map(t => `<button type="button" class="honor-tab-btn${t.id === aktif ? ' aktif' : ''}" data-tab="${t.id}" onclick="honorTabPilih('${t.id}')">${t.label}${t.badge ? `<span class="honor-tab-badge">${t.badge}</span>` : ''}</button>`).join('');
      const panel = ada.map(t => `<div class="honor-tab-panel${t.id === aktif ? ' aktif' : ''}" data-tab="${t.id}">${t.html}</div>`).join('');
      return `<div class="honor-tabs">${bar}</div>${panel}`;
    }
    function renderHonor() {
      // Kartu Tarif & Ekskul dan Guru Terajin TIDAK dirender di sini lagi: renderHonor dipanggil ulang oleh paging, callback panjar,
      // sholat, Kas, dll., dan ranking Guru Terajin itu berat (+ memicu muat Jadwal/Kalender). Keduanya dirender saat tab-nya dibuka
      // (honorMenuTab) dan setelah datanya berubah (simpan/hapus tarif ekskul, tetapkan Guru Terajin).
      const month = document.getElementById('honorMonth').value.padStart(2,'0'), year = document.getElementById('honorYear').value;
      const container = document.getElementById('honorResult'), btnPdf = document.getElementById('btnDownloadHonorPDF'), paginationEl = document.getElementById('honorPagination');
      const filteredJournals = allJournals.filter(j => { if (!j.tanggal) return false; const parts = j.tanggal.split('-'); return parts[0] === year && parts[1] === month && sesuaiTahunAjaranTermasukDataLama(j); }).filter(j => j.status !== 'ditolak');
      // Honor sholat: dari check-in petugas + jam + kelengkapan absensi siswa (lihat honorSholatHitung). Absen Religi lama hanya untuk tanggal sebelum HONOR_SHOLAT_MULAI_CHECKIN.
      const hs = honorSholatDapat(year, month, () => renderHonor());
      if (!hs.siap) { container.innerHTML = honorSholatStatusHtml(hs, 'renderHonor()'); btnPdf.style.display = 'none'; paginationEl.innerHTML = ''; return; }
      const filteredReligi = Object.keys(hs.hasil.perGuru);   // hanya dipakai untuk cek "ada data bulan ini"
      const filteredEvents = allEventAttendance.filter(e => { if (!e.tanggal) return false; const parts = e.tanggal.split('-'); return parts[0] === year && parts[1] === month && sesuaiTahunAjaranTermasukDataLama(e); });
      const filteredUjian = allUjianAttendance.filter(u => { if (!u.tanggal) return false; const parts = u.tanggal.split('-'); return parts[0] === year && parts[1] === month && sesuaiTahunAjaranTermasukDataLama(u); });
      const filteredEkskulPic = allEkskulPicHonor.filter(x => { if (!x.tanggal) return false; const parts = x.tanggal.split('-'); return parts[0] === year && parts[1] === month && sesuaiTahunAjaranTermasukDataLama(x); });
      const guruAktifTunjangan = honorGuruBertunjangan();
      const guruTerajinKey = year + '-' + month;
      const guruTerajinBulanIni = allGuruTerajin[guruTerajinKey];
      if (filteredJournals.length === 0 && filteredReligi.length === 0 && filteredEvents.length === 0 && filteredUjian.length === 0 && guruAktifTunjangan.length === 0 && !guruTerajinBulanIni) { container.innerHTML = '<p class="text-muted">Tidak ada data jurnal, religi, lembur/rapat, ujian, atau tunjangan untuk bulan ini.</p>'; btnPdf.style.display = 'none'; paginationEl.innerHTML = ''; return; }
      // ===== PENGELOMPOKAN PER GURU =====
      // Dikelompokkan pakai guruKey (Firebase key guru, unik per akun) sebagai key utama, BUKAN
      // nama guru -- dua guru dengan nama persis sama tidak akan tergabung jadi satu baris. Nama
      // guru tetap disimpan di tiap grup HANYA untuk ditampilkan. Fallback ke nama guru dipertahankan
      // untuk record lama yang mungkin belum punya guruKey, supaya tidak "hilang" dari rekap honor.
      // PENTING: semua sumber (jurnal/religi/event/ujian/ekskul PIC) HARUS resolve guruKey lewat
      // helper yang SAMA (bukan `x.guruKey || x.guru` sendiri-sendiri per sumber) -- kalau tidak,
      // guru yang sebagian recordnya sudah punya guruKey dan sebagian belum akan pecah jadi 2 baris
      // (satu di key=guruKey, satu di key=nama) dengan rincian honor berbeda-beda. Helper ini: pakai
      // guruKey kalau ada, kalau
      // tidak coba cari guruKey lewat nama via allGuru (guru itu sendiri PASTI unik by key),
      // baru fallback ke nama mentah kalau memang tidak ketemu guru manapun dgn nama itu.
      const grup = honorKelompokkan({ journals: filteredJournals, events: filteredEvents, ujian: filteredUjian, ekskulPic: filteredEkskulPic, religiPerGuru: hs.hasil.perGuru });   // religi: { gk: { nama, dluha, dzuhur } } sudah lolos check-in/jam/kelengkapan
      const { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic, dlKepala } = grup;
      const rates = v4GetHonorRates(), HONOR_KEPSEK = rates.kepsek, HONOR_KETUA_YAYASAN = rates.yayasan;   // diatur Admin di Tarif Honor Terpusat
      const allTeacherKeys = honorKunciGuru(grup, guruAktifTunjangan);
      let bonusList = []; bonusList.push({ label: 'Kepala Madrasah', amount: HONOR_KEPSEK + dlKepala.honor, dlJumlah: dlKepala.jumlah, dlHonor: dlKepala.honor }); bonusList.push({ label: 'Ketua Yayasan', amount: HONOR_KETUA_YAYASAN });
      if (guruTerajinBulanIni) bonusList.push({ label: `🏆 Guru Terajin - ${guruTerajinBulanIni.guru}`, amount: guruTerajinBulanIni.honor });
      // Kepala Madrasah & Ketua Yayasan (2 item pertama bonusList) SENGAJA ditaruh di baris paling
      // atas tabel honor (bukan lagi di bawah) -- Guru Terajin (kalau ada) tetap di bawah bersama
      // baris guru lain, karena itu memang penghargaan tambahan atas honor mengajar biasa mereka.
      let tableData = []; let totalHonor = 0; let totalReguler = 0, totalNonReguler = 0, totalEkstra = 0, totalEkstraHonor = 0, totalDluha = 0, totalDzuhur = 0, totalEventJumlah = 0, totalEventHonor = 0, totalUjianJumlah = 0, totalUjianHonor = 0, totalTunjangan = 0, totalTransport = 0;
      const pimpinanList = bonusList.slice(0, 2), bonusLainnya = bonusList.slice(2);
      pimpinanList.forEach(bonus => { tableData.push({ guru: bonus.label, reguler: '-', nonReguler: '-', ekstra: '-', ekstraHonor: 0, dluha: '-', dzuhur: '-', eventJumlah: bonus.dlJumlah > 0 ? bonus.dlJumlah : '-', eventHonor: bonus.dlHonor || 0, ujianJumlah: '-', ujianHonor: 0, tunjangan: 0, transport: 0, honor: bonus.amount, isBonus: true }); totalHonor += bonus.amount; totalEventJumlah += (bonus.dlJumlah || 0); totalEventHonor += (bonus.dlHonor || 0); });
      for (const guruKey of allTeacherKeys) {
        // totalEkstra (JUMLAH JAM) sengaja TIDAK ikut ditambah ekpic.jumlah: rekap jam mengajar murni dari jurnal. ekstraHonor (Rp) sudah
        // memuat kredit PIC/pengganti ekskul, dan sel "Ekstra" memakai nilai yang SAMA dengan yang dijumlah ke Total Honor & footer.
        const { j, r, ev, uj, guru, tunjangan, transport, ekstraHonor, honor } = honorRincianGuru(guruKey, grup, rates);
        totalHonor += honor; totalReguler += j.reguler; totalNonReguler += j.nonReguler; totalEkstra += j.ekstra; totalEkstraHonor += ekstraHonor; totalDluha += r.dluha; totalDzuhur += r.dzuhur; totalEventJumlah += ev.jumlah; totalEventHonor += ev.honor; totalUjianJumlah += uj.jumlah; totalUjianHonor += uj.honor; totalTunjangan += tunjangan; totalTransport += transport;
        tableData.push({ guru, reguler: j.reguler, nonReguler: j.nonReguler, ekstra: j.ekstra, ekstraHonor, dluha: r.dluha, dzuhur: r.dzuhur, eventJumlah: ev.jumlah, eventHonor: ev.honor, ujianJumlah: uj.jumlah, ujianHonor: uj.honor, tunjangan, transport, honor, gkey: guruKey });
      }
      bonusLainnya.forEach(bonus => { tableData.push({ guru: bonus.label, reguler: '-', nonReguler: '-', ekstra: '-', ekstraHonor: 0, dluha: '-', dzuhur: '-', eventJumlah: '-', eventHonor: 0, ujianJumlah: '-', ujianHonor: 0, tunjangan: 0, transport: 0, honor: bonus.amount, isBonus: true }); totalHonor += bonus.amount; });
      const totalItems = tableData.length, ps = pagerSize('honor') || totalItems || 1, totalPages = Math.max(1, Math.ceil(totalItems / ps));
      if (honorPage > totalPages) honorPage = totalPages; if (honorPage < 1) honorPage = 1;
      const start = (honorPage - 1) * ps, end = Math.min(start + ps, totalItems), pageItems = tableData.slice(start, end);
      // Panjar honor (guru mengambil honor lebih dulu): dicatat terpisah di node honor_panjar, TIDAK masuk Kas Umum.
      const ymHonor = year + '-' + month;
      const hpAdm = honorPanjarDapat(ymHonor, null, () => renderHonor());
      const panjarDari = it => (it.gkey ? honorPanjarTotal(hpAdm.data[it.gkey]) : 0);
      // Panjar yang belum termuat (offline / sedang dimuat / gagal) TIDAK boleh tampil sebagai "-" (= tidak ada panjar) dengan Sisa = Total Honor.
      const panjarStatus = hpAdm.gagal ? 'gagal' : (hpAdm.siap ? 'ok' : (isReallyOnline() ? 'memuat' : 'offline')), panjarOk = panjarStatus === 'ok';
      const panjarPesan = { gagal: '⚠️ Data panjar gagal dimuat (periksa koneksi atau aturan Firebase honor_panjar).', offline: '📡 Sedang offline: data panjar belum dimuat.', memuat: '⏳ Memuat data panjar...' }[panjarStatus] || '';
      const PANJAR_TAK_TAHU = '<span class="text-muted" title="Data panjar belum dimuat">⚠️ ?</span>';
      let totalPanjar = 0; tableData.forEach(it => { totalPanjar += panjarDari(it); });
      let htmlKas = '', htmlRincian = '';
      const panjarBanner = panjarOk ? '' : `<div style="margin-bottom:10px;padding:10px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;font-size:13px;color:#92400e;display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><span>${panjarPesan} Kolom Panjar dan Sisa Dibayar belum dapat dihitung (tanda ⚠️ ?).</span><button class="btn btn-soft" onclick="honorPanjarInvalidate();renderHonor()">🔄 Muat ulang panjar</button></div>`;
      let html = panjarBanner + `<div style="overflow-x:auto;"><table class="honor-rekap-tbl"><thead><tr><th>No</th><th>Nama Guru</th><th>Reguler</th><th>Non-Reguler</th><th>Ekstra</th><th>☀️ Dhuha</th><th>🕌 Dzuhur</th><th>⏰ Lembur/Rapat</th><th>📝 Ujian</th><th>💰 Tunjangan</th><th>🛵 Transport</th><th>Total Honor</th><th>💵 Panjar</th><th>Sisa Dibayar</th></tr></thead><tbody>`;
      let no = start + 1;
      for (const item of pageItems) {
        const isBonus = item.isBonus || false, bgStyle = isBonus ? 'style="background:#fef3c7;font-weight:600;"' : '';
        const eventCell = (isBonus && !(item.eventJumlah > 0)) ? '-' : `${item.eventJumlah}x (Rp ${item.eventHonor.toLocaleString()})`;   // baris Kepala menampilkan Dinas Luar bila ada
        const ujianCell = isBonus ? '-' : `${item.ujianJumlah}x (Rp ${item.ujianHonor.toLocaleString()})`;
        const tunjanganCell = isBonus ? '-' : `Rp ${item.tunjangan.toLocaleString()}`;
        const transportCell = isBonus ? '-' : `Rp ${item.transport.toLocaleString()}`;
        const ekstraCell = isBonus ? '-' : `${item.ekstra}x (Rp ${item.ekstraHonor.toLocaleString()})`;
        const pj = panjarDari(item);
        const panjarTakTahu = !!item.gkey && !panjarOk;
        let panjarCell = panjarTakTahu ? PANJAR_TAK_TAHU : (item.gkey ? (pj > 0 ? 'Rp ' + pj.toLocaleString() : '-') : '-');
        if (!panjarTakTahu && item.gkey && pj > item.honor) panjarCell += ' ⚠️';
        if (!panjarTakTahu && item.gkey && isAdmin()) panjarCell += ` <button class="btn btn-soft" style="padding:1px 7px;font-size:11px;" title="Catat panjar" onclick="honorPanjarTambah('${escapeJs(item.gkey)}')">➕</button>`;
        const sisaCell = panjarTakTahu ? PANJAR_TAK_TAHU : 'Rp ' + (item.gkey ? Math.max(0, item.honor - pj) : item.honor).toLocaleString();
        html += `<tr ${bgStyle}><td>${no++}</td><td>${escapeHtml(item.guru)}</td><td>${item.reguler}</td><td>${item.nonReguler}</td><td>${ekstraCell}</td><td>${item.dluha}</td><td>${item.dzuhur}</td><td>${eventCell}</td><td>${ujianCell}</td><td>${tunjanganCell}</td><td>${transportCell}</td><td>Rp ${item.honor.toLocaleString()}</td><td>${panjarCell}</td><td>${sisaCell}</td></tr>`;
      }
      html += `</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:right;">TOTAL</th><th>${totalReguler}</th><th>${totalNonReguler}</th><th>${totalEkstra}x (Rp ${totalEkstraHonor.toLocaleString()})</th><th>${totalDluha}</th><th>${totalDzuhur}</th><th>${totalEventJumlah}x (Rp ${totalEventHonor.toLocaleString()})</th><th>${totalUjianJumlah}x (Rp ${totalUjianHonor.toLocaleString()})</th><th>Rp ${totalTunjangan.toLocaleString()}</th><th>Rp ${totalTransport.toLocaleString()}</th><th style="color:#059669;">Rp ${totalHonor.toLocaleString()}</th><th>${panjarOk ? 'Rp ' + totalPanjar.toLocaleString() : PANJAR_TAK_TAHU}</th><th>${panjarOk ? 'Rp ' + (totalHonor - totalPanjar).toLocaleString() : PANJAR_TAK_TAHU}</th></tr></tfoot></table></div>`;
      const htmlPanjar = (panjarStatus === 'offline' || panjarStatus === 'memuat')
        ? `<p class="text-muted" style="font-size:13px;">${panjarPesan} Daftar panjar belum dapat ditampilkan. <button class="btn btn-soft" onclick="honorPanjarInvalidate();renderHonor()">🔄 Muat ulang</button></p>`
        : honorPanjarRincianHtml(hpAdm, tableData).replace('<details ', '<details open ');
      // Catat honor yang sudah dibayarkan ke Kas Umum (hanya Admin). Key tetap honor_<tahun>-<bulan> => tidak bisa tercatat dobel.
      if (isAdmin()) {
        const sudahKas = (allKasUmum || []).find(k => k.key === 'honor_' + year + '-' + month);
        htmlKas += `<div style="margin-top:14px;padding:12px;border:1px solid #d1d5db;border-radius:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">` + (sudahKas
          ? `<span>✅ Sudah dicatat di Kas Umum: <b>Rp ${Number(sudahKas.nominal || 0).toLocaleString('id-ID')}</b> (${escapeHtml(sudahKas.tanggal || '')}). Untuk mengubah nominal, pakai Edit di Kas Madrasah.</span>${Number(sudahKas.nominal || 0) !== totalHonor ? `<span style="color:#b45309;font-size:13px;">⚠️ Rekap honor sekarang Rp ${totalHonor.toLocaleString('id-ID')} (selisih Rp ${Math.abs(totalHonor - Number(sudahKas.nominal || 0)).toLocaleString('id-ID')}).</span><button id="btnHonorSamakan" class="btn btn-soft" onclick="honorSamakanKas()">Samakan dengan rekap</button>` : ''}`
          : `<button id="btnHonorKeKas" class="btn btn-soft" onclick="honorCatatKeKas()">💸 Catat honor bulan ini ke Kas Umum</button><span class="text-muted" style="font-size:12px;">Klik setelah honor dibayarkan. Yang dicatat = total honor SEBELUM dikurangi panjar (panjar tidak dicatat terpisah di Kas).</span>`) + `</div>`;
        const tglBayar = parseInt(MADRASAH.honorTanggalBayar, 10) || 0, bulanBayar = MADRASAH.honorBulanBayar === 'ini' ? 'ini' : 'lalu';
        htmlKas += `<div style="margin-top:10px;padding:12px;border:1px dashed #d1d5db;border-radius:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;">
          <b>🔔 Pengingat bayar honor</b>
          <span>Tanggal</span><input type="number" id="honorTglBayarInput" min="0" max="31" value="${tglBayar || ''}" placeholder="1-31" style="width:70px;">
          <span>membayar honor</span><select id="honorBulanBayarSel"><option value="lalu"${bulanBayar === 'lalu' ? ' selected' : ''}>bulan sebelumnya</option><option value="ini"${bulanBayar === 'ini' ? ' selected' : ''}>bulan berjalan</option></select>
          <button class="btn btn-soft" id="btnHonorJadwal" onclick="honorSimpanJadwalBayar()">Simpan</button>
          <span class="text-muted" style="font-size:12px;">Kosongkan tanggal untuk mematikan pengingat.${tglBayar ? ' Sekarang: tiap tanggal ' + tglBayar + '.' : ''}</span></div>`;
      }
      const mewakiliList = filteredJournals.filter(j => j.type === 'Non-Reguler' && j.mewakili).sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
      if (mewakiliList.length > 0) {
        htmlRincian += `<details open style="margin-top:16px;background:#eff6ff;border-radius:12px;padding:12px;border:1px solid #93c5fd;"><summary style="font-weight:700;cursor:pointer;color:#1e40af;">🔄 Rincian Mewakili Guru Lain (${mewakiliList.length})</summary><div style="margin-top:10px;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Guru Pengganti</th><th>Mewakili</th><th>Kelas</th><th>Jam</th><th>Mapel</th></tr></thead><tbody>`;
        mewakiliList.forEach(j => { htmlRincian += `<tr><td>${escapeHtml(j.tanggal)}</td><td>${escapeHtml(j.guru)}</td><td>${escapeHtml(j.mewakili)}</td><td>${escapeHtml(j.kelas)}</td><td>Jam ${escapeHtml(j.jam_ke)}</td><td>${escapeHtml(j.subject)}</td></tr>`; });
        htmlRincian += `</tbody></table></div></details>`;
      }
      htmlRincian += honorSholatDitolakHtml(hs.hasil.ditolak, true);
      const jmlRincian = mewakiliList.length + ((hs.hasil.ditolak || []).length);
      html = honorTabBungkus([
        { id: 'rekap', label: '📋 Rekap Honor', html },
        { id: 'panjar', label: '💵 Panjar', html: htmlPanjar },
        { id: 'kas', label: '💸 Kas & Pengingat', html: htmlKas },
        { id: 'rincian', label: '🔍 Rincian & Catatan', html: htmlRincian, badge: jmlRincian > 0 ? jmlRincian : '' }
      ]);
      container.innerHTML = html; btnPdf.style.display = 'inline-block';
      paginationEl.innerHTML = pagerHtml('honor', totalItems, totalPages, start, end, 'data');
      window._honorData = { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic, kunciGuru: [...allTeacherKeys], totalHonor, month, year, totalReguler, totalNonReguler, totalEkstra, totalEkstraHonor, totalDluha, totalDzuhur, totalEventJumlah, totalEventHonor, totalUjianJumlah, totalUjianHonor, totalTunjangan, totalTransport, bonusList, tableData };
      if (honorSetelahRenderHook && honorSetelahRenderHook.year === String(year) && honorSetelahRenderHook.bln === month) { const h = honorSetelahRenderHook; honorSetelahRenderHook = null; clearTimeout(h.timer); try { h.fn(); } catch (e) { console.warn('[SI MAMBA] hook honor:', e); } }
    }
    // ============================================================
    // PANJAR HONOR: guru mengambil sebagian honor lebih dulu. Dicatat di node honor_panjar/<YYYY-MM>/<guruKey>/<id>
    // ({nominal, tanggal, catatan?, guruNama, inputBy, inputByKey, inputAt}) -- TIDAK masuk Kas Umum (keputusan user: Kas Umum
    // hanya mencatat total honor SEBELUM dikurangi panjar). Batas: total panjar satu guru dalam sebulan tidak boleh melebihi
    // honor guru itu di rekap bulan tsb (ditegakkan di dalam transaction, jadi aman walau dua Admin mencatat bersamaan).
    // Admin/Kepsek membaca seluruh bulan; guru hanya membaca node miliknya (untuk Slip Honor). Perlu aturan baca/tulis
    // untuk node honor_panjar di firebase-security-rules.json (tulis: Admin saja).
    // ============================================================
    let honorPanjarCache = {};   // 'YYYY-MM|gk atau *' -> { status:'loading'|'ok'|'gagal', data:{gk:{id:rec}}, tunggu:[] }
    function honorPanjarInvalidate() { honorPanjarCache = {}; }
    function honorPanjarKeyValid(k) { return typeof k === 'string' && /^[^.$#\[\]\/]+$/.test(k); }
    function honorPanjarTotal(obj) {
      if (!obj || typeof obj !== 'object') return 0;
      return Object.keys(obj).reduce((a, id) => a + ((obj[id] && parseInt(obj[id].nominal, 10)) || 0), 0);
    }
    function honorPanjarDapat(ym, gk, onReady) {
      if (gk && !honorPanjarKeyValid(gk)) return { siap: true, data: {} };
      const ck = ym + '|' + (gk || '*'), c = honorPanjarCache[ck];
      if (c && c.status === 'ok') return { siap: true, data: c.data };
      if (c && c.status === 'gagal') return { siap: true, data: {}, gagal: true };
      if (c && c.status === 'loading') { if (onReady) c.tunggu.push(onReady); return { siap: false, data: {} }; }
      if (!db || !currentUser || !isReallyOnline()) return { siap: false, data: {} };
      const entry = honorPanjarCache[ck] = { status: 'loading', data: {}, tunggu: onReady ? [onReady] : [] };
      db.ref('honor_panjar/' + ym + (gk ? '/' + gk : '')).once('value').then(snap => {
        const v = snap.val() || {};
        entry.data = gk ? { [gk]: v } : v; entry.status = 'ok';
      }).catch(e => {
        console.warn('[SI MAMBA] Gagal memuat honor_panjar:', e && e.message || e);
        entry.status = 'gagal'; entry.data = {};
      }).then(() => { const cbs = entry.tunggu; entry.tunggu = []; cbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } }); });
      return { siap: false, data: {} };
    }
    // Versi menunggu dari honorPanjarDapat: resolve dengan hasil yang sama ({ siap, data, gagal? }) begitu pemuatan selesai atau lewat batas waktu.
    function honorPanjarTunggu(ym, batasMs) {
      return new Promise(resolve => {
        let selesai = false, timer = null;
        const akhir = () => { if (selesai) return; selesai = true; clearTimeout(timer); resolve(honorPanjarDapat(ym, null, null)); };
        const r = honorPanjarDapat(ym, null, akhir);
        if (r.siap || !isReallyOnline()) { selesai = true; return resolve(r); }
        timer = setTimeout(akhir, batasMs || 15000);
      });
    }
    function honorPanjarRincianHtml(hp, tableData) {
      if (hp.gagal) return `<p class="text-muted" style="font-size:12px;margin-top:10px;">⚠️ Data panjar tidak dapat dimuat (periksa aturan Firebase untuk node honor_panjar).</p>`;
      const rows = [];
      Object.keys(hp.data || {}).forEach(gk => Object.keys(hp.data[gk] || {}).forEach(id => { const r = hp.data[gk][id]; if (r && typeof r === 'object') rows.push({ gk, id, r }); }));
      rows.sort((a, b) => (a.r.tanggal || '').localeCompare(b.r.tanggal || '') || (a.r.inputAt || '').localeCompare(b.r.inputAt || ''));
      const total = rows.reduce((a, x) => a + (parseInt(x.r.nominal, 10) || 0), 0);
      const namaDari = {}; (tableData || []).forEach(it => { if (it.gkey) namaDari[it.gkey] = it.guru; });
      const body = rows.length ? rows.map(x => `<tr><td>${escapeHtml(x.r.tanggal || '')}</td><td>${escapeHtml(namaDari[x.gk] || x.r.guruNama || x.gk)}</td><td style="text-align:right;">Rp ${(parseInt(x.r.nominal, 10) || 0).toLocaleString()}</td><td>${escapeHtml(x.r.catatan || '')}</td><td>${isAdmin() ? `<button class="btn btn-danger" style="padding:1px 7px;font-size:11px;" onclick="honorPanjarHapus('${escapeJs(x.gk)}','${escapeJs(x.id)}')">Hapus</button>` : ''}</td></tr>`).join('')
        : `<tr><td colspan="5" class="text-muted">Belum ada panjar bulan ini.</td></tr>`;
      return `<details style="margin-top:16px;background:#f0fdf4;border-radius:12px;padding:12px;border:1px solid #86efac;"><summary style="font-weight:700;cursor:pointer;color:#166534;">💵 Panjar Honor bulan ini (${rows.length}) — Rp ${total.toLocaleString()}</summary><div style="margin-top:10px;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Guru</th><th>Nominal</th><th>Catatan</th><th></th></tr></thead><tbody>${body}</tbody></table></div><p class="text-muted" style="font-size:11px;margin-top:6px;">Panjar tidak dicatat di Kas Umum; tertera sebagai pengurang di kolom Sisa Dibayar dan di Slip Honor guru.</p></details><div style="margin-top:10px;"><button class="btn btn-soft" onclick="honorPanjarRekapTahun()">📅 Rekap panjar tahun ajaran ${escapeHtml(String(currentTahunAjaran))}</button><div id="honorPanjarTahunArea"></div></div>`;
    }
    // Rekap panjar satu tahun ajaran (Juli s.d. Juni) per guru. Dibaca per bulan (12 pembacaan kecil honor_panjar/<YYYY-MM>) karena
    // Rules hanya memberi izin baca di tingkat bulan; dimuat saat tombol diklik, bukan setiap halaman Honor dibuka.
    function honorPanjarRekapTahun() {
      const area = document.getElementById('honorPanjarTahunArea'); if (!area) return;
      if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
      if (isBusy('honorPanjarTahun')) return;
      const y1 = parseInt(String(currentTahunAjaran).split('/')[0], 10);
      if (!y1) return toast('Tahun ajaran aktif tidak terbaca.', true);
      const bulanList = []; for (let m = 7; m <= 12; m++) bulanList.push(y1 + '-' + String(m).padStart(2, '0')); for (let m = 1; m <= 6; m++) bulanList.push((y1 + 1) + '-' + String(m).padStart(2, '0'));
      const NAMA = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      setBusy('honorPanjarTahun');
      area.innerHTML = '<p class="text-muted" style="font-size:12px;">Memuat rekap panjar...</p>';
      Promise.all(bulanList.map(ym => db.ref('honor_panjar/' + ym).once('value').then(snap => ({ ym, v: snap.val() || {} }))))
        .then(hasil => {
          clearBusy('honorPanjarTahun');
          const per = {};
          hasil.forEach(({ ym, v }) => Object.keys(v).forEach(gk => Object.keys(v[gk] || {}).forEach(id => {
            const r = v[gk][id]; if (!r || typeof r !== 'object') return;
            const nom = parseInt(r.nominal, 10) || 0;
            if (!per[gk]) per[gk] = { nama: r.guruNama || gk, jumlah: 0, total: 0, bulan: {} };
            per[gk].jumlah += 1; per[gk].total += nom; per[gk].bulan[ym] = (per[gk].bulan[ym] || 0) + nom;
          })));
          const daftar = Object.keys(per).map(gk => per[gk]).sort((a, b) => b.total - a.total);
          if (!daftar.length) { area.innerHTML = `<p class="text-muted" style="font-size:12px;margin-top:8px;">Belum ada panjar di tahun ajaran ${escapeHtml(String(currentTahunAjaran))}.</p>`; return; }
          const semua = daftar.reduce((a, x) => a + x.total, 0), jmlSemua = daftar.reduce((a, x) => a + x.jumlah, 0);
          const rincian = x => Object.keys(x.bulan).sort().map(ym => NAMA[parseInt(ym.slice(5), 10) - 1] + ' ' + ym.slice(2, 4) + ': Rp ' + x.bulan[ym].toLocaleString('id-ID')).join(' • ');
          area.innerHTML = `<div style="margin-top:8px;overflow-x:auto;"><table><thead><tr><th>Guru</th><th>Pengambilan</th><th>Total Panjar</th><th>Per Bulan</th></tr></thead><tbody>${daftar.map(x => `<tr><td>${escapeHtml(x.nama)}</td><td style="text-align:center;">${x.jumlah}x</td><td style="text-align:right;">Rp ${x.total.toLocaleString('id-ID')}</td><td style="font-size:12px;">${escapeHtml(rincian(x))}</td></tr>`).join('')}</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th>TOTAL</th><th>${jmlSemua}x</th><th style="text-align:right;">Rp ${semua.toLocaleString('id-ID')}</th><th></th></tr></tfoot></table></div>`;
        })
        .catch(err => { clearBusy('honorPanjarTahun'); area.innerHTML = ''; toast('Gagal memuat rekap panjar: ' + (err && err.message || err), true); });
    }
    function honorPanjarTambah(gk) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mencatat panjar.', true);
      const d = window._honorData, row = d && (d.tableData || []).find(it => it.gkey === gk);
      if (!row) return toast('Data guru tidak ditemukan — muat ulang halaman Honor.', true);
      if (!honorPanjarKeyValid(gk)) return toast('Guru ini belum punya ID yang valid untuk mencatat panjar.', true);
      if (isBusy('honorPanjar')) return toast('Sedang menyimpan...', false, 1500);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Pencatatan panjar butuh koneksi internet — coba lagi setelah online.', true);
      const ym = d.year + '-' + d.month, hp = honorPanjarDapat(ym, null, null);
      if (hp.gagal) return toast('Data panjar tidak bisa dimuat — periksa aturan Firebase node honor_panjar.', true);
      if (!hp.siap) return toast('Data panjar masih dimuat, coba lagi sebentar.', true);
      const sudah = honorPanjarTotal(hp.data[gk]), maks = row.honor - sudah;
      if (maks <= 0) return toast(`Panjar ${row.guru} sudah mencapai batas (honor bulan ini Rp ${row.honor.toLocaleString('id-ID')}).`, true);
      const rp = n => 'Rp ' + n.toLocaleString('id-ID');
      honorModal({
        judul: '💵 Catat panjar honor',
        okLabel: 'Catat panjar',
        isiHtml: `<p style="font-size:14px;margin:0 0 10px;"><b>${escapeHtml(row.guru)}</b></p>
          <table style="font-size:13px;margin-bottom:10px;"><tbody><tr><td>Honor bulan ini (sementara)</td><td style="text-align:right;padding-left:16px;">${rp(row.honor)}</td></tr>
          <tr><td>Sudah diambil</td><td style="text-align:right;padding-left:16px;">${rp(sudah)}</td></tr>
          <tr><td><b>Maksimal panjar baru</b></td><td style="text-align:right;padding-left:16px;"><b>${rp(maks)}</b></td></tr></tbody></table>
          <label class="label" for="honorPanjarNominal">Nominal panjar (Rp)</label>
          <input id="honorPanjarNominal" class="field" type="text" inputmode="numeric" autocomplete="off" placeholder="mis. 200000" style="margin-bottom:10px;">
          <label class="label" for="honorPanjarCatatan">Catatan (opsional)</label>
          <input id="honorPanjarCatatan" class="field" type="text" maxlength="120" autocomplete="off">
          <p class="text-muted" style="font-size:12px;margin:10px 0 0;">Panjar TIDAK dicatat di Kas Umum; hanya mengurangi sisa yang dibayarkan.</p>`,
        ambil: ov => {
          const bersih = String(ov.querySelector('#honorPanjarNominal').value).replace(/^\s*Rp\.?/i, '').replace(/[.\s]/g, '');
          if (!/^\d+$/.test(bersih)) return { galat: 'Nominal harus berupa angka bulat.' };
          const nominal = parseInt(bersih, 10);
          if (nominal <= 0) return { galat: 'Nominal harus lebih dari 0.' };
          if (nominal > maks) return { galat: 'Melebihi batas: maksimal ' + rp(maks) + ' (sebesar sisa honor bulan ini).' };
          return { nilai: { nominal, catatan: String(ov.querySelector('#honorPanjarCatatan').value).trim().slice(0, 120) } };
        }
      }).then(hasil => {
        if (!hasil) return;
        if (!isReallyOnline()) return toast('📡 Sedang offline. Pencatatan panjar butuh koneksi internet — coba lagi setelah online.', true);
        if (isBusy('honorPanjar')) return toast('Sedang menyimpan...', false, 1500);
        honorPanjarSimpan(gk, row, ym, sudah, hasil.nominal, hasil.catatan);
      });
    }
    // Penyimpanan panjar (dipisah dari dialog input). Batas total ditegakkan di dalam transaction.
    function honorPanjarSimpan(gk, row, ym, sudah, nominal, catatan) {
      const ref = db.ref('honor_panjar/' + ym + '/' + gk), id = ref.push().key;
      const rec = { nominal, tanggal: tglLokal(), guruNama: row.guru, inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString() };
      if (catatan) rec.catatan = catatan;
      setBusy('honorPanjar');
      // Rules honor_panjar: tulis hanya untuk sesi Admin -> pastikan sesi_admin/{uid} terisi dulu (adminSesi()).
      adminSesi().then(() => {
        ref.transaction(cur => {
          const o = (cur && typeof cur === 'object') ? cur : {};
          if (honorPanjarTotal(o) + nominal > row.honor) return;   // batas ditegakkan di sini (anti dua Admin bersamaan)
          const baru = Object.assign({}, o); baru[id] = rec; return baru;
        }, (err, committed) => {
          clearBusy('honorPanjar');
          if (err) return toast(honorPesanGagalTulis(err, 'Panjar gagal dicatat'), true, 7000);
          if (!committed) { honorPanjarInvalidate(); toast('Panjar ditolak: total panjar akan melebihi honor bulan ini.', true, 5000); return renderHonor(); }
          toast('✅ Panjar ' + row.guru + ' tercatat.');
          addLog('catat_panjar_honor', `${row.guru} - ${ym} - Rp ${nominal.toLocaleString('id-ID')}`);
          // Beritahu guru yang bersangkutan lewat notifikasi aplikasi (gagal kirim tidak membatalkan panjar).
          try {
            const sisaSementara = Math.max(0, row.honor - sudah - nominal);
            const pn = v4Notify('Panjar honor tercatat', `Panjar honor Rp ${nominal.toLocaleString('id-ID')} tercatat pada ${tglLokal()}. Total panjar bulan ini Rp ${(sudah + nominal).toLocaleString('id-ID')}; sisa honor sementara Rp ${sisaSementara.toLocaleString('id-ID')}.`, 'INFO', gk, 'honor_panjar', id);
            if (pn && pn.catch) pn.catch(() => {});
          } catch (e) { /* diabaikan */ }
          honorPanjarInvalidate(); renderHonor();
        }, false);
      }).catch(err => { clearBusy('honorPanjar'); toast('Sesi Admin belum siap: ' + (err && err.message || err), true); });
    }
    function honorPanjarHapus(gk, id) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menghapus panjar.', true);
      const d = window._honorData; if (!d) return;
      const ym = d.year + '-' + d.month;
      if (!honorPanjarKeyValid(gk) || !honorPanjarKeyValid(id)) return;
      if (isBusy('honorPanjar')) return;
      if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
      if (!confirm('Hapus catatan panjar ini?\n\nSisa dibayar guru akan kembali bertambah.')) return;
      setBusy('honorPanjar');
      adminSesi().then(() => db.ref('honor_panjar/' + ym + '/' + gk + '/' + id).remove()).then(() => {
        clearBusy('honorPanjar');
        toast('Panjar dihapus.'); addLog('hapus_panjar_honor', `${gk} - ${ym}`);
        honorPanjarInvalidate(); renderHonor();
      }).catch(err => { clearBusy('honorPanjar'); toast(honorPesanGagalTulis(err, 'Panjar gagal dihapus'), true, 7000); });
    }
    // Simpan jadwal pengingat bayar honor (Admin) ke school_settings.
    function honorSimpanJadwalBayar() {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mengatur jadwal.', true);
      if (isBusy('honorJadwal')) return;
      const raw = String(document.getElementById('honorTglBayarInput').value || '').trim();
      const tgl = raw === '' ? 0 : Number(raw);
      if (!Number.isInteger(tgl) || tgl < 0 || tgl > 31) return toast('Tanggal harus angka 1-31 (kosongkan untuk mematikan pengingat).', true);
      const bulan = document.getElementById('honorBulanBayarSel').value === 'ini' ? 'ini' : 'lalu';
      const btn = document.getElementById('btnHonorJadwal');
      setBusy('honorJadwal', btn);
      tulisSettingsAdmin('school_settings', { honorTanggalBayar: tgl, honorBulanBayar: bulan, honorBayarUpdatedBy: currentUser.name, honorBayarUpdatedAt: new Date().toISOString() }, err => {
        clearBusy('honorJadwal', btn);
        if (err) return toast('Gagal: ' + (err.message || err), true);
        MADRASAH.honorTanggalBayar = tgl; MADRASAH.honorBulanBayar = bulan;
        try { Object.keys(sessionStorage).filter(k => k.indexOf('simamba_honor_pengingat_') === 0).forEach(k => sessionStorage.removeItem(k)); } catch (e) { /* diabaikan */ }
        toast(tgl ? `✅ Pengingat diatur: tiap tanggal ${tgl}, honor ${bulan === 'ini' ? 'bulan berjalan' : 'bulan sebelumnya'}.` : '✅ Pengingat bayar honor dimatikan.');
        addLog('atur_pengingat_honor', tgl ? `Tanggal ${tgl} - honor ${bulan === 'ini' ? 'bulan berjalan' : 'bulan sebelumnya'}` : 'dimatikan');
        renderHonor();
      });
    }
    // Pengingat (Admin): pada/ sesudah tanggal bayar, kalau honor bulan targetnya belum tercatat di Kas Umum, tawarkan buka halaman Honor
    // dengan bulan itu sudah terpilih. Hanya MENGINGATKAN -- pencatatan tetap lewat tombol + konfirmasi nominal di halaman Honor.
    // Dicek sekali per pemuatan halaman; "Nanti" menahan pengingat untuk bulan itu selama sesi (sessionStorage) tab ini.
    let _honorPengingatSudah = false, honorSetelahRenderHook = null;   // hook: { year, bln, fn, timer } dijalankan sekali oleh renderHonor()
    function honorPengingatCek() {
      if (_honorPengingatSudah) return;
      if (!currentUser || !db || !isAdmin()) return;
      const tglJadwal = parseInt(MADRASAH.honorTanggalBayar, 10) || 0;
      if (tglJadwal < 1 || tglJadwal > 31) return;
      const now = new Date();
      const akhirBulan = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (now.getDate() < Math.min(tglJadwal, akhirBulan)) return;
      if (!isReallyOnline()) return;
      _honorPengingatSudah = true;
      let y = now.getFullYear(), m = now.getMonth() + 1;
      if (MADRASAH.honorBulanBayar !== 'ini') { m -= 1; if (m < 1) { m = 12; y -= 1; } }
      const bln = String(m).padStart(2, '0'), key = 'honor_' + y + '-' + bln, flag = 'simamba_honor_pengingat_' + key;
      try { if (sessionStorage.getItem(flag)) return; } catch (e) { /* storage diblokir -> tetap tanya */ }
      db.ref('kas_umum/' + key).once('value').then(snap => {
        if (snap.exists()) return;
        const NAMA_BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const lbl = NAMA_BLN[m - 1] + ' ' + y;
        try { sessionStorage.setItem(flag, '1'); } catch (e) { /* diabaikan */ }
        return honorModal({
          judul: '🔔 Pengingat bayar honor',
          okLabel: 'Hitung & catat', batalLabel: 'Nanti',
          isiHtml: `<p style="font-size:14px;margin:0;">Honor <b>${escapeHtml(lbl)}</b> belum dicatat ke Kas Umum.</p><p class="text-muted" style="font-size:13px;margin:8px 0 0;">Hitung total honor &amp; catat sekarang? Nominal ditampilkan dulu sebelum disimpan.</p>`
        }).then(ya => {
          if (!ya) return;
          navigateTo('honor');
          const sy = document.getElementById('honorYear'), sm = document.getElementById('honorMonth');
          if (sy) sy.value = String(y); if (sm) sm.value = String(m);
          honorPage = 1; window._honorData = null;
          // Tanpa polling: renderHonor() memanggil hook ini begitu rekap bulan target SELESAI dirender (bisa menunggu data sholat). Batas tunggu 25 dtk.
          if (honorSetelahRenderHook) clearTimeout(honorSetelahRenderHook.timer);
          const hook = { year: String(y), bln, fn: () => honorCatatKeKas(), timer: null };
          hook.timer = setTimeout(() => { if (honorSetelahRenderHook === hook) { honorSetelahRenderHook = null; toast('Rekap honor belum siap — gunakan tombol "Catat honor bulan ini ke Kas Umum" di halaman Honor.', true, 6000); } }, 25000);
          honorSetelahRenderHook = hook;
          renderHonor();
        });
      }).catch(e => console.warn('[SI MAMBA] Pengingat honor gagal dicek:', e && e.message || e));
    }
    // Samakan nominal catatan Kas Umum honor bulan ini dengan total rekap SEKARANG (rekap bisa berubah setelah dicatat: jurnal susulan
    // disetujui, honor sholat dikoreksi, dst). Hanya Admin; tampil bila nominal di Kas berbeda dari rekap. Catatan lain tidak disentuh.
    function honorSamakanKas() {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah catatan Kas.', true);
      const d = window._honorData; if (!d || !(d.totalHonor > 0)) return toast('Rekap honor belum siap.', true);
      const key = 'honor_' + d.year + '-' + d.month, rec = (allKasUmum || []).find(k => k.key === key);
      if (!rec) return toast('Catatan Kas honor bulan ini tidak ditemukan — muat ulang halaman.', true);
      if (isBusy('honorSamakan')) return;
      if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
      const lama = Number(rec.nominal || 0), baru = d.totalHonor;
      if (lama === baru) return toast('Nominal sudah sama dengan rekap.');
      if (!confirm(`Ubah catatan Kas Umum "${rec.uraian || 'Honor'}"?\n\nNominal sekarang: Rp ${lama.toLocaleString('id-ID')}\nMenjadi (total rekap): Rp ${baru.toLocaleString('id-ID')}`)) return;
      const btn = document.getElementById('btnHonorSamakan');
      setBusy('honorSamakan', btn);
      db.ref('kas_umum/' + key).update({ nominal: baru, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        clearBusy('honorSamakan', btn);
        if (err) return toast('Gagal: ' + (err.message || err), true);
        toast('✅ Nominal Kas disamakan dengan rekap honor.');
        addLog('samakan_kas_honor', `${key} - Rp ${lama.toLocaleString('id-ID')} -> Rp ${baru.toLocaleString('id-ID')}`);
        reloadDataset('kasUmum', () => { renderHonor(); if (typeof renderKasUmum === 'function') try { renderKasUmum(); } catch (e) { /* halaman Kas belum dibuka */ } });
      });
    }
    // Mencatat honor yang SUDAH dibayarkan ke Kas Umum sebagai pengeluaran (kategori 'Honor / Transport / Insentif').
    // Satu catatan per bulan dengan key tetap honor_<tahun>-<bulan> + transaction => klik ganda / dua Admin tidak bisa mencatat dobel.
    // Nominal bawaan = total rekap Honor, boleh diubah (mis. dibayar sebagian). Field yang ditulis sama persis dengan kasSimpan() (kas.js),
    // jadi tidak butuh perubahan Rules. Catatan bisa diubah lewat Edit di Kas Madrasah.
    function honorCatatKeKas() {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mencatat ke Kas.', true);
      const d = window._honorData;
      if (!d || !(d.totalHonor > 0)) return toast('Belum ada total honor untuk dicatat.', true);
      if (isBusy('honorKeKas')) return toast('Sedang menyimpan...', false, 1500);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Pencatatan kas butuh koneksi internet — coba lagi setelah online.', true);
      const NAMA_BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const lbl = NAMA_BLN[parseInt(d.month, 10) - 1] + ' ' + d.year;
      const input = prompt(`Catat honor ${lbl} ke Kas Umum.\n\nTotal honor di rekap: Rp ${d.totalHonor.toLocaleString('id-ID')}\nNominal yang dicatat (total honor, sebelum dikurangi panjar):`, String(d.totalHonor));
      if (input === null) return;
      const bersih = String(input).replace(/^\s*Rp\.?/i, '').replace(/[.\s]/g, '');
      if (!/^\d+$/.test(bersih)) return toast('Nominal harus berupa angka bulat.', true);
      const nominal = parseInt(bersih, 10);
      if (nominal <= 0) return toast('Nominal harus lebih dari 0.', true);
      if (nominal > 1000000000) return toast('Nominal terlalu besar (> Rp 1 miliar) — periksa lagi jumlah nolnya.', true);
      if (!confirm(`Catat pengeluaran Kas Umum?\n\nHonor ${lbl}\nNominal: Rp ${nominal.toLocaleString('id-ID')}\nTanggal: hari ini\n\nSaldo Kas Umum akan berkurang.`)) return;
      const key = 'honor_' + d.year + '-' + d.month;
      const rec = { buku: 'umum', tanggal: tglLokal(), jenis: 'keluar', kategori: 'Honor / Transport / Insentif', uraian: 'Honor bulan ' + lbl, nominal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString() };
      const btn = document.getElementById('btnHonorKeKas');
      setBusy('honorKeKas', btn);
      db.ref('kas_umum/' + key).transaction(cur => (cur === null ? rec : undefined), (err, committed) => {
        clearBusy('honorKeKas', btn);
        if (err) return toast('Gagal: ' + (err.message || err), true);
        if (!committed) {
          toast(`Honor ${lbl} sudah pernah dicatat ke Kas. Untuk mengubah nominal, pakai Edit di Kas Madrasah.`, true, 6000);
          return reloadDataset('kasUmum', () => renderHonor());
        }
        toast('✅ Honor ' + lbl + ' tercatat di Kas Umum.');
        addLog('catat_kas', `Kas Umum - keluar - Honor / Transport / Insentif - Rp ${nominal.toLocaleString('id-ID')} - Honor bulan ${lbl}`);
        reloadDataset('kasUmum', () => { renderHonor(); if (typeof renderKasUmum === 'function') try { renderKasUmum(); } catch (e) { /* halaman Kas belum dibuka */ } });
      }, false);
    }
    // Slip Honor pribadi (Guru/Wali Kelas) — read-only, hanya data milik currentUser sendiri.
    // Tidak ada input tarif/edit di halaman ini; semua tarif tetap ditentukan Admin di halaman Honor.
    function renderHonorSlip() {
      const monthSel = document.getElementById('honorSlipMonth'), yearSel = document.getElementById('honorSlipYear');
      const month = monthSel.value.padStart(2,'0'), year = yearSel.value;
      const container = document.getElementById('honorSlipResult');
      const namaSaya = currentUser.name;
      const hs = honorSholatDapat(year, month, () => renderHonorSlip());
      if (!hs.siap) { container.innerHTML = honorSholatStatusHtml(hs, 'renderHonorSlip()'); return; }
      // SATU kunci identitas untuk seluruh slip: resolver yang SAMA dengan rekap Admin & honor sholat (honorBuatResolver).
      const resolveGk = honorBuatResolver(), kunciSaya = resolveGk(currentUser.key, namaSaya);
      const sholatSaya = hs.hasil.perGuru[kunciSaya] || { dluha: 0, dzuhur: 0 };
      const ditolakSaya = hs.hasil.ditolak.filter(x => x.gk === kunciSaya);
      // Setiap record dicocokkan lewat resolver yang sama dengan rekap Admin (guruKey bila ada; bila tidak, dicari lewat nama
      // di allGuru), lalu dibandingkan dengan kunciSaya. Dulu: guruKey dibandingkan ke currentUser.key tetapi record lama
      // tanpa guruKey dicocokkan lewat nama mentah -- bisa berbeda dengan rekap Admin (mis. dua guru bernama sama, atau
      // currentUser.key kosong), sehingga angka slip bisa tidak sama dengan baris guru itu di Rekap Honor.
      const cocokSaya = (rec) => resolveGk(rec.guruKey, rec.guru) === kunciSaya;
      const inBulan = (tgl) => { if (!tgl) return false; const p = tgl.split('-'); return p[0] === year && p[1] === month; };
      const fJournals = allJournals.filter(j => cocokSaya(j) && inBulan(j.tanggal) && sesuaiTahunAjaranTermasukDataLama(j) && j.status !== 'ditolak');
      const fEvents = allEventAttendance.filter(e => cocokSaya(e) && inBulan(e.tanggal) && sesuaiTahunAjaranTermasukDataLama(e));
      const fUjian = allUjianAttendance.filter(u => cocokSaya(u) && inBulan(u.tanggal) && sesuaiTahunAjaranTermasukDataLama(u));
      const fEkskulPic = allEkskulPicHonor.filter(x => cocokSaya(x) && inBulan(x.tanggal) && sesuaiTahunAjaranTermasukDataLama(x));
      const rates = v4GetHonorRates();
      // Agregasi lewat util yang SAMA dengan rekap Admin & PDF (honorKelompokkan + honorRincianGuru), hanya dengan data milik guru ini.
      const grupSaya = honorKelompokkan({ journals: fJournals, events: fEvents, ujian: fUjian, ekskulPic: fEkskulPic, religiPerGuru: { [kunciSaya]: sholatSaya } });
      const ring = honorRincianGuru(kunciSaya, grupSaya, rates, namaSaya);
      const reguler = ring.j.reguler, nonReguler = ring.j.nonReguler, ekstra = ring.j.ekstra, ekstraHonor = ring.j.ekstraHonor;
      const dluha = ring.r.dluha, dzuhur = ring.r.dzuhur;   // dari check-in petugas yang lolos pemeriksaan
      const eventJumlah = ring.ev.jumlah, eventHonor = ring.ev.honor, ujianJumlah = ring.uj.jumlah, ujianHonor = ring.uj.honor;
      // Kredit honor otomatis krn jadi PIC/pengganti ekskul yang mencatat absensi (v4SaveEkskulAttendance): baris terpisah di slip biar transparan,
      // tetapi sudah ikut dijumlahkan ke ekstra dalam ring.honor.
      const ekskulPicJumlah = ring.ekpic.jumlah, ekskulPicHonorTotal = ring.ekpic.honor;
      const tunjangan = ring.tunjangan, transport = ring.transport;
      const gt = allGuruTerajin[year+'-'+month];
      const bonusTerajin = (gt && resolveGk(gt.guruKey, gt.guru) === kunciSaya) ? (gt.honor||0) : 0;
      const total = ring.honor + bonusTerajin;
      const namaBulan = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)];
      if (fJournals.length===0 && (dluha+dzuhur)===0 && ditolakSaya.length===0 && fEvents.length===0 && fUjian.length===0 && fEkskulPic.length===0 && total===0) {
        container.innerHTML = `<p class="text-muted">Belum ada data honor untuk ${namaBulan} ${year}.</p>`;
        return;
      }
      const baris = (label, ket, nilai) => `<tr><td style="padding:5px 0;">${escapeHtml(label)}</td><td class="text-muted" style="padding:5px 0;text-align:center;">${escapeHtml(String(ket))}</td><td style="padding:5px 0;text-align:right;">Rp ${nilai.toLocaleString()}</td></tr>`;
      let rows = '';
      if (reguler>0) rows += baris('Mengajar Reguler', reguler+' jam', reguler*rates.reguler);
      if (nonReguler>0) rows += baris('Mengajar Non-Reguler', nonReguler+' jam', nonReguler*rates.nonReguler);
      if (ekstra>0) rows += baris('Ekstrakurikuler', ekstra+' jam', ekstraHonor);
      if (dluha>0) rows += baris('Sholat Dhuha', dluha+' hari', dluha*rates.dluha);
      if (dzuhur>0) rows += baris('Sholat Dzuhur', dzuhur+' hari', dzuhur*rates.dzuhur);
      if (eventJumlah>0) rows += baris('Lembur/Rapat', eventJumlah+'x', eventHonor);
      if (ujianJumlah>0) rows += baris('Honor Ujian', ujianJumlah+'x', ujianHonor);
      if (ekskulPicJumlah>0) rows += baris('PIC/Pengganti Ekskul', ekskulPicJumlah+'x', ekskulPicHonorTotal);
      if (tunjangan>0) rows += baris('Tunjangan Masa Kerja', '-', tunjangan);
      if (transport>0) rows += baris('Bantuan Transportasi', '-', transport);
      if (bonusTerajin>0) rows += baris('🏆 Guru Terajin', '-', bonusTerajin);
      // FIX: slip honor pribadi sebelumnya cuma menampilkan TOTAL jam "Mengajar Non-Reguler"
      // tanpa rincian tanggal/kelas/mewakili siapa -- guru tidak bisa mengecek sendiri apakah
      // jumlah itu benar, beda dengan halaman Honor Admin yang sudah punya detail "Rincian
      // Mewakili Guru Lain". Sekarang ditambahkan rincian yang sama (dipersempit ke data milik
      // guru ybs sendiri) supaya slip ini bisa dicek sendiri sebelum tanya ke Admin.
      const mewakiliListSaya = fJournals.filter(j => j.type === 'Non-Reguler' && j.mewakili).sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
      let mewakiliHtml = '';
      if (mewakiliListSaya.length > 0) {
        mewakiliHtml = `<details style="margin-top:12px;background:#eff6ff;border-radius:10px;padding:10px;border:1px solid #93c5fd;"><summary style="font-weight:700;cursor:pointer;color:#1e40af;font-size:13px;">🔄 Rincian Mengajar Non-Reguler (${mewakiliListSaya.length})</summary><div style="margin-top:8px;overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr><th style="text-align:left;">Tanggal</th><th style="text-align:left;">Mewakili</th><th style="text-align:left;">Kelas</th><th style="text-align:center;">Jam</th><th style="text-align:left;">Mapel</th></tr></thead><tbody>`;
        mewakiliListSaya.forEach(j => { mewakiliHtml += `<tr><td>${escapeHtml(j.tanggal)}</td><td>${escapeHtml(j.mewakili)}</td><td>${escapeHtml(j.kelas)}</td><td style="text-align:center;">${escapeHtml(j.jam_ke)}</td><td>${escapeHtml(j.subject)}</td></tr>`; });
        mewakiliHtml += `</tbody></table></div></details>`;
      }
      const hpSaya = honorPanjarDapat(year + '-' + month, kunciSaya, () => renderHonorSlip());
      const panjarSaya = honorPanjarTotal(hpSaya.data[kunciSaya]);
      // Panjar belum termuat (offline / sedang dimuat / gagal) BUKAN berarti tidak ada panjar: jangan tampilkan seolah-olah nol.
      const panjarSiapSaya = hpSaya.siap && !hpSaya.gagal;
      const panjarPesanSaya = hpSaya.gagal ? '⚠️ Data panjar gagal dimuat' : (!isReallyOnline() ? '📡 Sedang offline, data panjar belum dimuat' : '⏳ Memuat data panjar...');
      const panjarHtml = !panjarSiapSaya ? `
          <div style="font-size:12px;margin-top:8px;color:#b45309;">${panjarPesanSaya}. Potongan panjar (bila ada) belum ditampilkan, jadi "Sisa Dibayarkan" belum bisa dihitung. <a href="#" onclick="honorPanjarInvalidate();renderHonorSlip();return false;">Muat ulang</a></div>`
        : (panjarSaya > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;color:#b45309;"><span>Panjar yang sudah diambil</span><span>- Rp ${panjarSaya.toLocaleString()}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px;margin-top:6px;"><span>SISA DIBAYARKAN</span><span style="color:#059669;">Rp ${Math.max(0, total - panjarSaya).toLocaleString()}</span></div>` : '');
      const ditolakHtml = honorSholatDitolakHtml(ditolakSaya, false);
      container.innerHTML = `
        <div style="max-width:480px;margin:0 auto;background:#fff;border:1px dashed #94a3b8;border-radius:12px;padding:20px;">
          <div style="text-align:center;margin-bottom:12px;">
            <div style="font-weight:800;font-size:16px;">🧾 SLIP HONOR</div>
            <div class="text-muted" style="font-size:12px;">${escapeHtml(namaSaya)} • ${namaBulan} ${year}</div>
          </div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;"><tr><th style="text-align:left;">Rincian</th><th style="text-align:center;">Jumlah</th><th style="text-align:right;">Honor</th></tr>${rows}</table>
          ${mewakiliHtml}${ditolakHtml}
          <div style="border-top:2px dashed #94a3b8;margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;font-weight:800;font-size:15px;">
            <span>TOTAL</span><span style="color:#059669;">Rp ${total.toLocaleString()}</span>
          </div>${panjarHtml}
          <p class="text-muted" style="font-size:11px;margin-top:12px;text-align:center;">Slip ini dihitung otomatis oleh sistem berdasarkan tarif dari Admin. Untuk koreksi, hubungi Admin.</p>
        </div>`;
    }

    // Pembungkus: kegagalan APA PUN saat membuat PDF (muat logo/TTD, ttdKepalaPdf, jsPDF/autoTable, dll.) selalu dilaporkan ke
    // pengguna dan dicatat di konsol, bukan jadi penolakan promise yang lenyap tanpa pesan. Juga mencegah klik ganda.
    async function downloadHonorPDF() {
      if (isBusy('honorPdf')) return;
      setBusy('honorPdf');
      try { await honorPdfBuat(); }
      catch (e) {
        console.error('[SI MAMBA] PDF Honor gagal dibuat:', e);
        toast('❌ PDF Honor gagal dibuat: ' + ((e && e.message) || e) + '. Coba lagi; bila berulang, muat ulang halaman.', true, 8000);
      } finally { clearBusy('honorPdf'); }
    }
    async function honorPdfBuat() {
      const data = window._honorData; if (!data) return toast('Hitung honor terlebih dahulu!', true);
      const { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic, totalHonor, month, year, totalReguler, totalNonReguler, totalEkstra, totalEkstraHonor, totalDluha, totalDzuhur, totalEventJumlah, totalEventHonor, totalUjianJumlah, totalUjianHonor, totalTunjangan, totalTransport, bonusList } = data;
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      // Panjar honor per guru (dibaca dari cache honor_panjar yang sudah dimuat halaman Honor). Kalau belum selesai dimuat, jangan bikin PDF
      // dengan angka panjar kosong yang menyesatkan; kalau gagal dimuat (mis. Rules belum dipasang), PDF tetap dibuat tanpa panjar + peringatan.
      // Tunggu pemuatan panjar yang sedang berjalan (mis. baru saja mencatat panjar -> cache di-invalidate -> dimuat ulang) sampai maks. 15 dtk,
      // alih-alih menolak dengan "coba lagi sebentar". Offline tidak menunggu (tidak ada yang bisa dimuat).
      toast('⏳ Menyiapkan data panjar...', false, 1500);
      const hpPdf = await honorPanjarTunggu(year + '-' + month);
      if (!hpPdf.siap) return toast(!isReallyOnline() ? '📡 Sedang offline — data panjar belum termuat, PDF ditunda supaya kolom Panjar tidak menyesatkan. Sambungkan internet lalu klik Hitung.' : 'Data panjar belum selesai dimuat (server lambat) — coba unduh lagi sebentar.', true, 6000);
      if (hpPdf.gagal) toast('⚠️ Data panjar tidak dapat dimuat — kolom Panjar & Sisa Dibayar di PDF diberi tanda ?.', true, 6000);
      const panjarTakAdaPdf = !!hpPdf.gagal;
      let totalPanjarPdf = 0, totalPanjarEfektifPdf = 0;
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [215, 330], compress: true }); const pageWidth = doc.internal.pageSize.getWidth(), pageHeight = doc.internal.pageSize.getHeight(); // F4 landscape
      const rates = v4GetHonorRates();
      // Perkecil gambar sebelum masuk PDF. Logo/TTD asli bisa beresolusi sangat besar dan, tanpa ini, tertanam
      // mentah di PDF (penyebab file membengkak ratusan MB). Logo 20 mm dan TTD 30 mm cukup ~300 dpi.
      const kecilkanGambar = (dataUrl, maxPx) => new Promise(resolve => {
        if (!dataUrl) return resolve(null);
        const im = new Image();
        im.onload = () => {
          try {
            const r = Math.min(1, maxPx / Math.max(im.naturalWidth, im.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(im.naturalWidth * r)); c.height = Math.max(1, Math.round(im.naturalHeight * r));
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/png'));
          } catch (e) { resolve(null); }
        };
        im.onerror = () => resolve(null);
        im.src = dataUrl;
      });
      const NAVY = [15, 23, 42], BIRU = [0, 107, 79], HIJAU_TUA = [0, 84, 63], EMAS = [217, 180, 90], EMAS_MUDA = [240, 217, 160], ABU = [100, 116, 139];   // hijau & emas = warna tema login madrasah
      // Pita hijau tua + garis emas tipis di atas halaman
      doc.setFillColor(HIJAU_TUA[0], HIJAU_TUA[1], HIJAU_TUA[2]); doc.rect(0, 0, pageWidth, 4, 'F');
      doc.setFillColor(EMAS[0], EMAS[1], EMAS[2]); doc.rect(0, 4, pageWidth, 0.8, 'F');
      // Logo dalam lencana putih berbingkai hijau (seperti di halaman login), cincin putus-putus emas, bayangan tipis.
      // Logo: resolusi 600 px dan proporsi aslinya dijaga (tidak melar).
      // Pemuatan aset opsional (logo/TTD gambar): gagal -> PDF tetap dibuat tanpa aset itu, dan pengguna diberi tahu di akhir.
      const peringatanPdf = [];
      const muatAman = async (nama, fn) => { try { return await fn(); } catch (e) { console.warn('[SI MAMBA] ' + nama + ' gagal dimuat untuk PDF Honor:', e); peringatanPdf.push(nama); return null; } };
      const logoHonor = await muatAman('logo', async () => kecilkanGambar(await v4LoadLogoForPdf(), 600));
      const lcx = 28, lcy = 18.5, lr = 11.5;
      let logoW = 0;
      if (logoHonor) {
        try {
          doc.setFillColor(226, 232, 240); doc.circle(lcx + 0.5, lcy + 0.8, lr, 'F');                       // bayangan tipis
          doc.setLineWidth(0.3); doc.setDrawColor(EMAS[0], EMAS[1], EMAS[2]); doc.setLineDashPattern([1.1, 1.1], 0); doc.circle(lcx, lcy, lr + 1.7, 'S'); doc.setLineDashPattern([], 0);   // cincin emas putus-putus
          doc.setFillColor(255, 255, 255); doc.setDrawColor(HIJAU_TUA[0], HIJAU_TUA[1], HIJAU_TUA[2]); doc.setLineWidth(0.8); doc.circle(lcx, lcy, lr, 'FD');   // lencana putih bingkai hijau
          const pl = doc.getImageProperties(logoHonor), kotak = 2 * lr - 5, skala = Math.min(kotak / pl.width, kotak / pl.height);
          const lw = pl.width * skala, lh = pl.height * skala;
          doc.addImage(logoHonor, 'PNG', lcx - lw / 2, lcy - lh / 2, lw, lh, undefined, 'FAST');
          logoW = 2 * (lr + 1.7);
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan logo ke PDF Honor:', e); logoW = 0; }
        doc.setLineWidth(0.2);
      }
      const teksX = logoW ? 15 + logoW + 5 : 15;
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]); doc.setFont(undefined, 'bold'); doc.setFontSize(18); doc.text('REKAP HONOR GURU', teksX, 18);
      doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.setTextColor(ABU[0], ABU[1], ABU[2]); doc.text(String(MADRASAH.nama || ''), teksX, 24.5);
      // Label periode di kanan atas
      const periodeTeks = `Periode  ${monthName} ${year}`;
      doc.setFont(undefined, 'bold'); doc.setFontSize(11);
      const periodeW = doc.getTextWidth(periodeTeks) + 12;
      doc.setFillColor(236, 253, 245); doc.roundedRect(pageWidth - 15 - periodeW, 13, periodeW, 11, 2.5, 2.5, 'F');
      doc.setTextColor(BIRU[0], BIRU[1], BIRU[2]); doc.text(periodeTeks, pageWidth - 15 - periodeW / 2, 20, { align: 'center' });
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(15, 34, pageWidth - 15, 34);
      doc.setTextColor(0); doc.setFont(undefined, 'normal');
      // Sama seperti renderHonor(): Kepala Madrasah & Ketua Yayasan (2 item pertama bonusList)
      // ditaruh di baris PALING ATAS tabel, Guru Terajin (kalau ada, item sisanya) tetap di
      // bawah. Deteksi baris "bonus" untuk pewarnaan kuning di bawah tidak lagi dari teks label
      // (karena teks "(Bonus)" sudah dihapus) melainkan dari nomor baris (bonusRowIndices).
      const pimpinanListPdf = bonusList.slice(0, 2).sort((x, y) => (/yayasan/i.test(y.label) ? 1 : 0) - (/yayasan/i.test(x.label) ? 1 : 0)), bonusLainnyaPdf = bonusList.slice(2);   // Ketua Yayasan no. 1, Kepala Madrasah no. 2
      const rows = []; let no = 1; const bonusRowIndices = new Set();
      pimpinanListPdf.forEach(bonus => { bonusRowIndices.add(rows.length); rows.push([no++, bonus.label, '-', '-', '-', '-', '-', bonus.dlJumlah > 0 ? bonus.dlJumlah + 'x' : '-', '-', '-', `Rp ${bonus.amount.toLocaleString()}`, '-', `Rp ${bonus.amount.toLocaleString()}`, '']); });   // kolom Lembur = Dinas Luar Kepala bila ada
      // Kunci guru PDF = daftar yang sama persis dengan yang tampil di layar (disimpan renderHonor); cadangan: hitung ulang dengan util yang sama.
      const grupPdf = { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic: groupedEkskulPic || {} };
      const allTeacherKeysPdf = Array.isArray(data.kunciGuru) ? data.kunciGuru : honorKunciGuru(grupPdf, honorGuruBertunjangan());
      for (const guruKey of allTeacherKeysPdf) { const { j, r, ev, uj, guru, tunjangan, transport, honor } = honorRincianGuru(guruKey, grupPdf, rates); const pjP = honorPanjarTotal(hpPdf.data[guruKey]); totalPanjarPdf += pjP; totalPanjarEfektifPdf += Math.min(pjP, honor); rows.push([no++, guru, j.reguler, j.nonReguler, `${j.ekstra}x`, r.dluha, r.dzuhur, `${ev.jumlah}x`, `${uj.jumlah}x`, `${(tunjangan+transport).toLocaleString()}`, `Rp ${honor.toLocaleString()}`, panjarTakAdaPdf ? '?' : (pjP > 0 ? `Rp ${pjP.toLocaleString()}` : '-'), panjarTakAdaPdf ? '?' : `Rp ${Math.max(0, honor - pjP).toLocaleString()}`, '']); }
      bonusLainnyaPdf.forEach(bonus => { bonusRowIndices.add(rows.length); rows.push([no++, bonus.label, '-', '-', '-', '-', '-', '-', '-', '-', `Rp ${bonus.amount.toLocaleString()}`, '-', `Rp ${bonus.amount.toLocaleString()}`, '']); });
      // Tinggi baris menyesuaikan jumlah guru supaya tabel + tanda tangan muat 1 halaman.
      const ruangTabel = pageHeight - 116;   // tinggi halaman - (awal tabel 38 + judul kolom 8 + baris TOTAL 10 + jarak 10 + blok TTD 40 + margin bawah 10)
      const tinggiBaris = Math.max(8, Math.min(12, ruangTabel / Math.max(rows.length, 1)));
      const ukuranFont = tinggiBaris >= 9 ? 9 : 8;
      doc.autoTable({ startY: 38, head: [['No', 'Guru', 'Reg', 'Non-Reg', 'Ekstra', 'Dhuha', 'Dzuhur', 'Lembur', 'Ujian', 'Tunj+Trans', 'Honor', 'Panjar', 'Sisa Dibayar', 'Tanda Tangan']], body: rows, foot: [['', 'TOTAL', totalReguler, totalNonReguler, `${totalEkstra}x`, totalDluha, totalDzuhur, `${totalEventJumlah}x`, `${totalUjianJumlah}x`, `${(totalTunjangan+totalTransport).toLocaleString()}`, `Rp ${totalHonor.toLocaleString()}`, panjarTakAdaPdf ? '?' : (totalPanjarPdf > 0 ? `Rp ${totalPanjarPdf.toLocaleString()}` : '-'), panjarTakAdaPdf ? '?' : `Rp ${(totalHonor - totalPanjarEfektifPdf).toLocaleString()}`, '']], theme: 'grid', styles: { fontSize: ukuranFont, valign: 'middle', cellPadding: 1.8, lineWidth: 0.15, lineColor: [203, 213, 225], textColor: [30, 41, 59] }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'center' }, 10: { halign: 'right', fontStyle: 'bold' }, 11: { halign: 'right' }, 12: { halign: 'right', fontStyle: 'bold' }, 13: { cellWidth: 42 } }, headStyles: { fillColor: BIRU, textColor: [255, 255, 255], fontSize: ukuranFont, fontStyle: 'bold', lineColor: BIRU }, footStyles: { fillColor: [226, 232, 240], textColor: NAVY, fontStyle: 'bold', fontSize: 9.5 }, didParseCell: function(data) { if (data.section === 'foot' && data.column.index === 10) { data.cell.styles.fillColor = [5,150,105]; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontSize = 10; data.cell.styles.fontStyle = 'bold'; } if (data.section === 'body') { data.cell.styles.minCellHeight = tinggiBaris; } if (data.section === 'body' && bonusRowIndices.has(data.row.index)) { data.cell.styles.fillColor = [255,247,214]; data.cell.styles.fontStyle = 'bold'; } }, margin: { left: 15, right: 15 }, showFoot: 'lastPage' });
      const finalY = doc.lastAutoTable.finalY;
      const ttdKepalaDataHonor = await muatAman('gambar tanda tangan Kepala', async () => kecilkanGambar(await v4LoadTtdKepalaForPdf(), 360));
      let ySignHonor = finalY + 10;
      if (ySignHonor > pageHeight - 45) { doc.addPage(); ySignHonor = 20; }   // tanda tangan hanya di halaman terakhir; pindah halaman kalau sisa ruang kurang
      // Kepala di KIRI, Bendahara di KANAN, berjauhan.
      const xKepala = 15 + 55, xBendahara = pageWidth - 15 - 55;
      doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text('Mengetahui,', xKepala, ySignHonor, { align: 'center' });
      doc.text('Kepala Madrasah', xKepala, ySignHonor + 5, { align: 'center' });
      doc.text('Bendahara', xBendahara, ySignHonor + 5, { align: 'center' });
      const yNama = ySignHonor + 27;
      // Tanda tangan digital Kepala: bila gagal diproses, JANGAN diam-diam jatuh ke gambar tanda tangan biasa -- PDF dibuat tanpa
      // tanda tangan Kepala dan pengguna diberi peringatan jelas (silakan unduh ulang atau tanda tangani manual).
      let ttdHonor = { dipakai: false }, ttdGagal = false;
      try {
        ttdHonor = await ttdKepalaPdf(doc, xKepala, ySignHonor + 7, { lebar: 30, tinggiMaks: 18, hanyaPimpinan: true, meta: { jenis: 'Rekap Honor Guru', ket: monthName + ' ' + year } });
        ttdHonor = ttdHonor || { dipakai: false };
      } catch (e) { ttdGagal = true; console.error('[SI MAMBA] ttdKepalaPdf gagal:', e); peringatanPdf.push('tanda tangan digital Kepala (' + ((e && e.message) || 'galat tidak diketahui') + ')'); }
      if (!ttdGagal && !ttdHonor.dipakai && ttdKepalaDataHonor) {
        try {
          const ttdW = 30;
          const propsTtd = doc.getImageProperties(ttdKepalaDataHonor);
          const ttdH = Math.min(15, ttdW * (propsTtd.height / propsTtd.width));
          doc.addImage(ttdKepalaDataHonor, 'PNG', xKepala - ttdW/2, ySignHonor + 8, ttdW, ttdH, undefined, 'FAST');
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Honor:', e); }
      }
      doc.setFont(undefined, 'bold');
      doc.text(MADRASAH.kepala_sekolah || '', xKepala, yNama, { align: 'center' });
      doc.text(MADRASAH.bendahara || '(.............................)', xBendahara, yNama, { align: 'center' });
      doc.setFont(undefined, 'normal');
      const nipOk = v => v && String(v).trim() !== '' && String(v).trim() !== '-';
      if (nipOk(MADRASAH.nip_kepala_sekolah)) doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, xKepala, yNama + 5, { align: 'center' });
      if (nipOk(MADRASAH.nip_bendahara)) doc.text('NIP/NUPTK. ' + MADRASAH.nip_bendahara, xBendahara, yNama + 5, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(ABU[0], ABU[1], ABU[2]);
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, pageHeight - 6);
      doc.setTextColor(0);
      doc.save(`Honor_Guru_${monthName}_${year}.pdf`);
      if (peringatanPdf.length) toast('📥 PDF Honor diunduh, TETAPI tanpa: ' + peringatanPdf.join('; ') + '. Periksa hasilnya sebelum dicetak.', true, 9000);
      else toast('📥 PDF Honor berhasil diunduh!');
    }

// Pembungkus pemuat PDF malas (fungsi pembungkusnya didefinisikan di app.js, bagian "EXPORT PDF/EXCEL").
if (typeof simambaBungkusExportLazy === 'function') simambaBungkusExportLazy([['downloadHonorPDF', 'pdf', 'PDF']]);
