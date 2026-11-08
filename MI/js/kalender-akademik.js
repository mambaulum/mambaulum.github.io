// ============================================================
// kalender-akademik.js -- KALENDER AKADEMIK, KALENDER NASIONAL & "HARI INI" (dipecah dari app.js, tahap 6)
// ============================================================
// Isi: halaman Kalender Akademik (bulan, daftar agenda, tambah/hapus agenda, impor hari nasional) dan
// panel "Hari Ini" (peringatan/libur) di layar pilih Guru/Orang Tua + Dashboard (hariIniInit).
// Dimuat SESUDAH js/app.js (index.html). Satu-satunya kode yang jalan saat dimuat: hariIniInit() di bagian bawah
// (dulu dipanggil dari dalam app.js pada saat yang sama -- setelah HTML selesai diurai).
// ============================================================


    // ============================================================
    // KALENDER AKADEMIK
    // ============================================================
    // Menggabungkan 3 sumber: agenda manual (kalender_akademik, diisi Admin/Kepsek: Libur &
    // Agenda Akademik), Acara (allEvents, sudah ada dari fitur lain), dan Ujian (allUjian,
    // sudah ada). Jadi kalender ini otomatis lengkap tanpa perlu input ulang Acara/Ujian yang
    // sudah dicatat di menu lain.
    let kalenderBulanAktif = new Date().getMonth(), kalenderTahunAktif = new Date().getFullYear();
    function setupKalenderAkademikPage() {
      const now = new Date();
      kalenderBulanAktif = now.getMonth(); kalenderTahunAktif = now.getFullYear();
      const formCard = document.getElementById('kalenderAdminFormCard');
      if (formCard) formCard.style.display = (isAdmin() || isKepsek()) ? 'block' : 'none';
      renderKalenderAkademik();
    }
    function ubahBulanKalender(delta) {
      kalenderBulanAktif += delta;
      if (kalenderBulanAktif > 11) { kalenderBulanAktif = 0; kalenderTahunAktif++; }
      else if (kalenderBulanAktif < 0) { kalenderBulanAktif = 11; kalenderTahunAktif--; }
      renderKalenderAkademik();
    }
    function kembaliKeBulanIni() {
      const now = new Date();
      kalenderBulanAktif = now.getMonth(); kalenderTahunAktif = now.getFullYear();
      renderKalenderAkademik();
    }
    // Ambil semua "agenda" (dari 3 sumber) yang jatuh pada tanggal tertentu (YYYY-MM-DD).
    function agendaPadaTanggal(dateStr) {
      const hasil = [];
      allKalenderAkademik.forEach(k => {
        const mulai = k.tanggalMulai, selesai = k.tanggalSelesai || k.tanggalMulai;
        if (dateStr >= mulai && dateStr <= selesai) hasil.push({ jenis: k.jenis, judul: k.judul, keterangan: k.keterangan, key: k.key, sumber: 'manual' });
      });
      allEvents.forEach(e => { if (e.tanggal === dateStr) hasil.push({ jenis: 'acara', judul: e.nama, keterangan: e.jenis, sumber: 'acara' }); });
      allUjian.forEach(u => { if (u.tanggal === dateStr) hasil.push({ jenis: 'ujian', judul: u.nama, keterangan: u.jenis, sumber: 'ujian' }); });
      return hasil;
    }
    function renderKalenderAkademik() {
      const label = document.getElementById('kalenderBulanLabel');
      const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][kalenderBulanAktif];
      label.textContent = `${namaBulan} ${kalenderTahunAktif}`;
      const grid = document.getElementById('kalenderGrid');
      const warnaJenis = { libur: '#dc2626', ujian: '#7c3aed', acara: '#f59e0b', akademik: '#059669' };
      const hariHeader = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(h => `<div class="text-muted" style="text-align:center;font-size:11px;font-weight:700;padding:4px 0;">${h}</div>`).join('');
      const tanggal1 = new Date(kalenderTahunAktif, kalenderBulanAktif, 1);
      const jumlahHari = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
      const offsetAwal = tanggal1.getDay();
      const todayStr = tglLokal();
      let sel = '';
      for (let i = 0; i < offsetAwal; i++) sel += '<div></div>';
      for (let d = 1; d <= jumlahHari; d++) {
        const dateStr = `${kalenderTahunAktif}-${String(kalenderBulanAktif+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const agenda = agendaPadaTanggal(dateStr);
        const dots = [...new Set(agenda.map(a=>a.jenis))].map(j => `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${warnaJenis[j]||'#9ca3af'};margin:0 1px;"></span>`).join('');
        const isToday = dateStr === todayStr;
        sel += `<div onclick="lihatHariKalender('${dateStr}')" style="cursor:pointer;text-align:center;padding:6px 2px;border-radius:8px;background:${isToday?'#eff6ff':'transparent'};border:${isToday?'1px solid #93c5fd':'1px solid transparent'};">
          <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'#2563eb':'#374151'};">${d}</div>
          <div style="height:8px;">${dots}</div>
        </div>`;
      }
      grid.innerHTML = hariHeader + sel;
      renderKalenderList(null);
    }
    function lihatHariKalender(dateStr) { renderKalenderList(dateStr); }
    function renderKalenderList(filterTanggal) {
      const box = document.getElementById('kalenderListArea'), title = document.getElementById('kalenderListTitle');
      const warnaJenis = { libur: '#dc2626', ujian: '#7c3aed', acara: '#f59e0b', akademik: '#059669' };
      const iconJenis = { libur: '🔴', ujian: '🟣', acara: '🟠', akademik: '🟢' };
      let daftar = [];
      if (filterTanggal) {
        title.innerHTML = `Agenda ${escapeHtml(filterTanggal)} <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:8px;" onclick="renderKalenderList(null)">✕ Lihat sebulan</button>`;
        daftar = agendaPadaTanggal(filterTanggal).map(a => ({ ...a, tanggal: filterTanggal }));
      } else {
        const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][kalenderBulanAktif];
        title.textContent = `Agenda Bulan ${namaBulan} ${kalenderTahunAktif}`;
        const jumlahHari = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
        for (let d = 1; d <= jumlahHari; d++) {
          const dateStr = `${kalenderTahunAktif}-${String(kalenderBulanAktif+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          agendaPadaTanggal(dateStr).forEach(a => daftar.push({ ...a, tanggal: dateStr }));
        }
      }
      if (daftar.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada agenda.</p>'; return; }
      box.innerHTML = daftar.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
          <div>
            <span style="font-size:13px;">${iconJenis[a.jenis]||'📌'} <strong>${escapeHtml(a.judul)}</strong></span>
            <span class="text-muted" style="font-size:11px;"> — ${escapeHtml(a.tanggal)}${a.keterangan ? ' — ' + escapeHtml(a.keterangan) : ''}</span>
          </div>
          ${(a.sumber === 'manual' && isAdmin()) ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="hapusAgendaKalender('${a.key}')">🗑️</button>` : ''}
        </div>`).join('');
    }
    // Data resmi: SKB 3 Menteri (Kemenag+Kemenaker+KemenPANRB) ttg Hari Libur Nasional & Cuti
    // Bersama 2026 (ditetapkan 19 Sept 2025) dan 2027 (No. 1205/3/2 Tahun 2026, ditetapkan
    // 15 Sept 2026; sumber: Setneg, dicek 21 Sept 2026), digabung dengan Kalender Pendidikan Madrasah TA
    // 2026/2027 (SK Dirjen Pendis Kemenag No. 4860 Tahun 2026, ditetapkan 13 Juni 2026). Dicek
    // ulang lewat pencarian web tanggal 14 Sept 2026 -- kalau ada perubahan resmi susulan
    // (mis. tanggal Idul Fitri 1448H yg masih "menyesuaikan ketetapan pemerintah"), perlu
    // diperbarui manual nanti oleh Admin.
    const KALENDER_NASIONAL_SEED = [
      // --- Libur Nasional 2026 (17 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Tahun Baru Masehi 2026', tanggalMulai:'2026-01-01', tanggalSelesai:'2026-01-01' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2026-01-16', tanggalSelesai:'2026-01-16' },
      { jenis:'libur', judul:'Tahun Baru Imlek 2577 Kongzili', tanggalMulai:'2026-02-17', tanggalSelesai:'2026-02-17' },
      { jenis:'libur', judul:'Hari Suci Nyepi (Tahun Baru Saka 1948)', tanggalMulai:'2026-03-19', tanggalSelesai:'2026-03-19' },
      { jenis:'libur', judul:'Hari Raya Idul Fitri 1447 H', tanggalMulai:'2026-03-21', tanggalSelesai:'2026-03-22' },
      { jenis:'libur', judul:'Wafat Yesus Kristus', tanggalMulai:'2026-04-03', tanggalSelesai:'2026-04-03' },
      { jenis:'libur', judul:'Kebangkitan Yesus Kristus (Paskah)', tanggalMulai:'2026-04-05', tanggalSelesai:'2026-04-05' },
      { jenis:'libur', judul:'Hari Buruh Internasional', tanggalMulai:'2026-05-01', tanggalSelesai:'2026-05-01' },
      { jenis:'libur', judul:'Kenaikan Yesus Kristus', tanggalMulai:'2026-05-14', tanggalSelesai:'2026-05-14' },
      { jenis:'libur', judul:'Hari Raya Idul Adha 1447 H', tanggalMulai:'2026-05-27', tanggalSelesai:'2026-05-27' },
      { jenis:'libur', judul:'Hari Raya Waisak 2570 BE', tanggalMulai:'2026-05-31', tanggalSelesai:'2026-05-31' },
      { jenis:'libur', judul:'Hari Lahir Pancasila', tanggalMulai:'2026-06-01', tanggalSelesai:'2026-06-01' },
      { jenis:'libur', judul:'Tahun Baru Islam 1448 H (1 Muharram)', tanggalMulai:'2026-06-16', tanggalSelesai:'2026-06-16' },
      { jenis:'libur', judul:'Hari Proklamasi Kemerdekaan RI', tanggalMulai:'2026-08-17', tanggalSelesai:'2026-08-17' },
      { jenis:'libur', judul:'Maulid Nabi Muhammad SAW', tanggalMulai:'2026-08-25', tanggalSelesai:'2026-08-25' },
      { jenis:'libur', judul:'Kelahiran Yesus Kristus (Natal)', tanggalMulai:'2026-12-25', tanggalSelesai:'2026-12-25' },
      // --- Cuti Bersama 2026 (8 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Cuti Bersama Tahun Baru Imlek', tanggalMulai:'2026-02-16', tanggalSelesai:'2026-02-16' },
      { jenis:'libur', judul:'Cuti Bersama Hari Suci Nyepi', tanggalMulai:'2026-03-18', tanggalSelesai:'2026-03-18' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1447 H', tanggalMulai:'2026-03-20', tanggalSelesai:'2026-03-20' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1447 H', tanggalMulai:'2026-03-23', tanggalSelesai:'2026-03-24' },
      { jenis:'libur', judul:'Cuti Bersama Kenaikan Yesus Kristus', tanggalMulai:'2026-05-15', tanggalSelesai:'2026-05-15' },
      { jenis:'libur', judul:'Cuti Bersama Idul Adha 1447 H', tanggalMulai:'2026-05-28', tanggalSelesai:'2026-05-28' },
      { jenis:'libur', judul:'Cuti Bersama Natal', tanggalMulai:'2026-12-24', tanggalSelesai:'2026-12-24' },
      // --- Kalender Pendidikan Madrasah TA 2026/2027 (Kemenag, agenda akademik non-libur-nasional) ---
      { jenis:'akademik', judul:'Awal Masuk Tahun Ajaran 2026/2027', tanggalMulai:'2026-07-13', tanggalSelesai:'2026-07-13' },
      { jenis:'akademik', judul:'Pengenalan Lingkungan Madrasah (Matsama)', tanggalMulai:'2026-07-13', tanggalSelesai:'2026-07-18' },
      { jenis:'akademik', judul:'Asesmen Sumatif Akhir Semester (ASAS) Gasal', tanggalMulai:'2026-11-23', tanggalSelesai:'2026-12-05' },
      { jenis:'akademik', judul:'Penyerahan Rapor Semester Gasal', tanggalMulai:'2026-12-18', tanggalSelesai:'2026-12-18' },
      { jenis:'libur', judul:'Libur Semester Gasal', tanggalMulai:'2026-12-21', tanggalSelesai:'2027-01-02' },
      { jenis:'akademik', judul:'Awal Masuk Semester Genap', tanggalMulai:'2027-01-04', tanggalSelesai:'2027-01-04' },
      { jenis:'libur', judul:'Libur Idul Fitri 1448 H (menyesuaikan ketetapan pemerintah)', tanggalMulai:'2027-03-06', tanggalSelesai:'2027-03-13', keterangan: 'Rentang libur madrasah menurut Kaldik. SKB 3 Menteri (15 Sep 2026): Idul Fitri 10-11 Mar 2027 + cuti bersama 9, 12, 15 Mar; tanggal final Idul Fitri ditetapkan Menteri Agama' },
      { jenis:'libur', judul:'Libur Akhir Tahun Ajaran 2026/2027', tanggalMulai:'2027-06-21', tanggalSelesai:'2027-07-10' },
      // --- Libur Nasional 2027 (18 hari, SKB 3 Menteri No. 1205/3/2 Tahun 2026, ditetapkan 15 Sept 2026) ---
      // Tanggal Idul Fitri/Idul Adha 1448 H final ditetapkan dengan Keputusan Menteri Agama.
      { jenis:'libur', judul:'Tahun Baru 2027 Masehi', tanggalMulai:'2027-01-01', tanggalSelesai:'2027-01-01' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2027-01-05', tanggalSelesai:'2027-01-05' },
      { jenis:'libur', judul:'Tahun Baru Imlek 2578 Kongzili', tanggalMulai:'2027-02-06', tanggalSelesai:'2027-02-06' },
      { jenis:'libur', judul:'Hari Suci Nyepi (Tahun Baru Saka 1949)', tanggalMulai:'2027-03-08', tanggalSelesai:'2027-03-08' },
      { jenis:'libur', judul:'Hari Raya Idul Fitri 1448 H', tanggalMulai:'2027-03-10', tanggalSelesai:'2027-03-11' },
      { jenis:'libur', judul:'Wafat Yesus Kristus', tanggalMulai:'2027-03-26', tanggalSelesai:'2027-03-26' },
      { jenis:'libur', judul:'Kebangkitan Yesus Kristus (Paskah)', tanggalMulai:'2027-03-28', tanggalSelesai:'2027-03-28' },
      { jenis:'libur', judul:'Hari Buruh Internasional', tanggalMulai:'2027-05-01', tanggalSelesai:'2027-05-01' },
      { jenis:'libur', judul:'Kenaikan Yesus Kristus', tanggalMulai:'2027-05-06', tanggalSelesai:'2027-05-06' },
      { jenis:'libur', judul:'Hari Raya Idul Adha 1448 H', tanggalMulai:'2027-05-17', tanggalSelesai:'2027-05-17' },
      { jenis:'libur', judul:'Hari Raya Waisak 2571 BE', tanggalMulai:'2027-05-20', tanggalSelesai:'2027-05-20' },
      { jenis:'libur', judul:'Hari Lahir Pancasila', tanggalMulai:'2027-06-01', tanggalSelesai:'2027-06-01' },
      { jenis:'libur', judul:'Tahun Baru Islam 1449 H (1 Muharram)', tanggalMulai:'2027-06-06', tanggalSelesai:'2027-06-06' },
      { jenis:'libur', judul:'Hari Proklamasi Kemerdekaan RI', tanggalMulai:'2027-08-17', tanggalSelesai:'2027-08-17' },
      { jenis:'libur', judul:'Maulid Nabi Muhammad SAW', tanggalMulai:'2027-08-15', tanggalSelesai:'2027-08-15' },
      { jenis:'libur', judul:'Kelahiran Yesus Kristus (Natal)', tanggalMulai:'2027-12-25', tanggalSelesai:'2027-12-25' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2027-12-26', tanggalSelesai:'2027-12-26' },
      // --- Cuti Bersama 2027 (8 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Cuti Bersama Tahun Baru Imlek', tanggalMulai:'2027-02-05', tanggalSelesai:'2027-02-05' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-09', tanggalSelesai:'2027-03-09' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-12', tanggalSelesai:'2027-03-12' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-15', tanggalSelesai:'2027-03-15' },
      { jenis:'libur', judul:'Cuti Bersama Wafat Yesus Kristus', tanggalMulai:'2027-03-25', tanggalSelesai:'2027-03-25' },
      { jenis:'libur', judul:'Cuti Bersama Idul Adha 1448 H', tanggalMulai:'2027-05-18', tanggalSelesai:'2027-05-18' },
      { jenis:'libur', judul:'Cuti Bersama Waisak', tanggalMulai:'2027-05-19', tanggalSelesai:'2027-05-19' },
      { jenis:'libur', judul:'Cuti Bersama Natal', tanggalMulai:'2027-12-24', tanggalSelesai:'2027-12-24' }
    ];
    function imporKalenderNasional() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const belumAda = KALENDER_NASIONAL_SEED.filter(k => !allKalenderAkademik.some(existing => existing.judul === k.judul && existing.tanggalMulai === k.tanggalMulai));
      if (belumAda.length === 0) { toast('✅ Semua agenda resmi ini sudah ada di kalender.'); return; }
      if (!doubleConfirm(`Impor ${belumAda.length} agenda resmi (Libur Nasional 2026-2027 & Kaldik Madrasah 2026/2027)? Yang sudah ada di kalender akan dilewati otomatis.`)) return;
      const updates = {};
      belumAda.forEach(k => {
        const key = db.ref('kalender_akademik').push().key;
        updates[key] = { jenis: k.jenis, judul: k.judul, tanggalMulai: k.tanggalMulai, tanggalSelesai: k.tanggalSelesai, keterangan: k.keterangan || null, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      });
      db.ref('kalender_akademik').update(updates, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ ${belumAda.length} agenda resmi berhasil diimpor!`); addLog('impor_kalender_nasional', belumAda.length + ' agenda');
        Object.entries(updates).forEach(([key, val]) => allKalenderAkademik.push({ key, ...val }));
        renderKalenderAkademik();
      });
    }

    // ===== BEGIN CHOOSER-HARIINI =====
    // "Ucapan hari ini" di halaman awal (sebelum login): Isra Mi'raj -> "Selamat memperingati Isra Mi'raj",
    // Minggu -> "Selamat berlibur", masa ujian -> "Selamat menempuh ...", dst.
    // Sumber: (1) KALENDER_NASIONAL_SEED yang tertanam di app (jalan offline & tanpa Firebase),
    // (2) hari peringatan tetap di bawah, (3) Kalender Akademik/Acara/Ujian dari Firebase (dibaca setelah
    // auth anonim siap, di-cache di localStorage supaya tetap tampil saat offline).
    // Kalau ada beberapa agenda pada hari yang sama, dipilih yang paling spesifik (skor tertinggi).
    // Semua teks dari Firebase dirender dengan textContent (bukan innerHTML) -> aman dari XSS.
    const HARIINI_TETAP = {   // 'BB-HH' -> hari peringatan/libur tetap (fallback untuk tahun yang belum ada di seed)
      '01-01': { score: 100, emoji: '🎉', text: y => `Selamat Tahun Baru ${y}! Semoga tahun ini penuh berkah` },
      '04-21': { score: 60,  emoji: '🌺', text: () => 'Selamat Hari Kartini' },
      '05-01': { score: 100, emoji: '🛠️', text: () => 'Selamat Hari Buruh Internasional' },
      '05-02': { score: 60,  emoji: '📚', text: () => 'Selamat Hari Pendidikan Nasional. Mari terus belajar dan mendidik dengan hati' },
      '06-01': { score: 100, emoji: '🦅', text: () => 'Selamat Hari Lahir Pancasila' },
      '07-23': { score: 60,  emoji: '🧒', text: () => 'Selamat Hari Anak Nasional' },
      '08-17': { score: 100, emoji: '🇮🇩', text: y => `Dirgahayu Republik Indonesia ke-${y - 1945}! Selamat Hari Kemerdekaan` },
      '10-22': { score: 60,  emoji: '🕌', text: () => 'Selamat Hari Santri' },
      '10-28': { score: 60,  emoji: '✊', text: () => 'Selamat Hari Sumpah Pemuda' },
      '11-10': { score: 60,  emoji: '🎖️', text: () => 'Selamat Hari Pahlawan. Mari teladani semangat para pahlawan' },
      '11-25': { score: 60,  emoji: '🙏', text: () => 'Selamat Hari Guru Nasional. Terima kasih, Bapak/Ibu Guru' },
      '12-22': { score: 60,  emoji: '💐', text: () => 'Selamat Hari Ibu' },
      '12-25': { score: 100, emoji: '🕊️', text: () => 'Libur nasional: Hari Natal. Selamat merayakan bagi yang merayakan, dan selamat berlibur!' }
    };
    // Aturan per judul agenda (yang cocok pertama menang). j = judul, y = tahun tanggal yang dicek.
    const HARIINI_ATURAN = [
      { re: /isra\s*mi['’`]?(kraj|raj)/i,               score: 100, emoji: '🌙', text: () => "Selamat memperingati Isra Mi'raj Nabi Muhammad SAW" },
      { re: /cuti\s*bersama/i,                          score: 55,  emoji: '🗓️', text: j => j.replace(/^\s*cuti\s*bersama\s*/i, 'Cuti bersama ').trim() + '. Selamat berlibur!' },
      { re: /^\s*(hari\s*raya\s*)?idul\s*fitri/i,       score: 100, emoji: '🌙', text: () => 'Selamat Hari Raya Idul Fitri. Taqabbalallahu minna wa minkum, mohon maaf lahir dan batin' },
      { re: /^\s*(hari\s*raya\s*)?idul\s*adha/i,        score: 100, emoji: '🕋', text: () => 'Selamat Hari Raya Idul Adha. Taqabbalallahu minna wa minkum' },
      { re: /tahun\s*baru\s*islam|1\s*mu?harram?/i,     score: 100, emoji: '🌙', text: () => 'Selamat Tahun Baru Islam 1 Muharram. Semoga tahun yang baru penuh berkah' },
      { re: /maulid/i,                                  score: 100, emoji: '🕌', text: () => 'Selamat memperingati Maulid Nabi Muhammad SAW' },
      { re: /^\s*tahun\s*baru(\s*masehi|\s*\d{4})/i,    score: 100, emoji: '🎉', text: (j, y) => `Selamat Tahun Baru ${y}! Semoga tahun ini penuh berkah` },
      { re: /proklamasi|kemerdekaan/i,                  score: 100, emoji: '🇮🇩', text: (j, y) => `Dirgahayu Republik Indonesia ke-${y - 1945}! Selamat Hari Kemerdekaan` },
      { re: /lahir\s*pancasila/i,                       score: 100, emoji: '🦅', text: () => 'Selamat Hari Lahir Pancasila' },
      { re: /buruh/i,                                   score: 100, emoji: '🛠️', text: () => 'Selamat Hari Buruh Internasional' },
      { re: /imlek|nyepi|waisak|natal|kelahiran\s*yesus|wafat\s*yesus|paskah|kebangkitan\s*yesus|kenaikan\s*yesus/i,
                                                        score: 100, emoji: '🕊️', text: j => `Libur nasional: ${j.replace(/\s*\(.*?\)\s*/g, ' ').trim()}. Selamat merayakan bagi yang merayakan, dan selamat berlibur!` },
      { re: /asesmen|\basas\b|ujian|penilaian\s*(tengah|akhir)|sumatif|\b(pts|pas|sts|sas|pat)\b|ulangan/i,
                                                        score: 90,  emoji: '📝', text: j => `Selamat menempuh ${j}. Semoga sukses dan diberi kemudahan` },
      { re: /rapor|raport/i,                            score: 80,  emoji: '📄', text: j => `${j}. Terima kasih atas dukungan Bapak/Ibu wali murid` },
      { re: /awal\s*masuk|masuk\s*tahun\s*ajaran|matsama|pengenalan\s*lingkungan/i,
                                                        score: 80,  emoji: '🎒', text: j => `Selamat datang kembali! ${j}` },
      { re: /libur/i,                                   score: 50,  emoji: '🌴', text: j => `Selamat berlibur! ${j.replace(/\s*\(.*?\)\s*/g, ' ').trim()}` }
    ];
    const HARIINI = { items: [], el: null, emoji: null, text: null, chooser: null, lastDate: '', lastFetch: 0, fetching: false, obs: null };
    const HARIINI_CACHE_KEY = 'simambaHariIniCache';

    function hariIniKandidat(it, y) {
      const j = String(it.judul || '').trim();
      if (!j) return null;
      if (it.jenis === 'ujian') return { score: 90, emoji: '📝', text: `Selamat menempuh ${j}. Semoga sukses dan diberi kemudahan` };
      for (let i = 0; i < HARIINI_ATURAN.length; i++) {
        const r = HARIINI_ATURAN[i];
        if (r.re.test(j)) return { score: r.score, emoji: r.emoji, text: r.text(j, y) };
      }
      if (it.jenis === 'libur') return { score: 50, emoji: '🌴', text: `Selamat berlibur! ${j}` };
      if (it.jenis === 'acara' || it.sumber === 'acara') return { score: 70, emoji: '🎉', text: `Hari ini: ${j}. Selamat mengikuti kegiatan!` };
      return { score: 40, emoji: '📌', text: `Hari ini: ${j}` };
    }
    // dateStr 'YYYY-MM-DD' -> {emoji, text} paling spesifik untuk tanggal itu, atau null kalau hari biasa.
    function hariIniPilih(dateStr) {
      const y = parseInt(dateStr.slice(0, 4), 10), md = dateStr.slice(5);
      const cands = [];
      KALENDER_NASIONAL_SEED.concat(HARIINI.items).forEach(it => {
        const mulai = it.tanggalMulai, sel = it.tanggalSelesai || mulai;
        if (!mulai || dateStr < mulai || dateStr > sel) return;
        const c = hariIniKandidat(it, y);
        if (c) cands.push(c);
      });
      const tetap = HARIINI_TETAP[md];
      if (tetap) cands.push({ score: tetap.score, emoji: tetap.emoji, text: tetap.text(y) });
      if (new Date(y, parseInt(md.slice(0, 2), 10) - 1, parseInt(md.slice(3), 10)).getDay() === 0) {
        cands.push({ score: 10, emoji: '🌴', text: 'Selamat berlibur! Selamat menikmati hari Minggu bersama keluarga' });
      }
      cands.sort((a, b) => b.score - a.score);
      return cands[0] || null;
    }
    function hariIniRender() {
      if (!HARIINI.el) return;
      const tgl = tglLokal();
      HARIINI.lastDate = tgl;
      const p = hariIniPilih(tgl);
      if (!p) { HARIINI.el.style.display = 'none'; return; }
      HARIINI.emoji.textContent = p.emoji;
      HARIINI.text.textContent = p.text;
      HARIINI.el.style.display = 'flex';
    }
    function hariIniSimpanCache() {
      try {
        const batas = tglLokal();
        const ringkas = HARIINI.items.filter(it => (it.tanggalSelesai || it.tanggalMulai) >= batas).slice(0, 250);
        localStorage.setItem(HARIINI_CACHE_KEY, JSON.stringify(ringkas));
      } catch (e) {}
    }
    function hariIniMuatCache() {
      try {
        const raw = JSON.parse(localStorage.getItem(HARIINI_CACHE_KEY) || '[]');
        if (Array.isArray(raw)) HARIINI.items = raw.filter(it => it && it.tanggalMulai && it.judul);
      } catch (e) {}
    }
    // Baca agenda dari Firebase (kalender_akademik, events, ujian) SETELAH auth anonim siap. Gagal/offline -> diam,
    // tetap pakai seed + cache. Maksimal sekali per 30 menit.
    function hariIniMuat() {
      if (HARIINI.fetching || !navigator.onLine || !HARIINI.chooser || HARIINI.chooser.style.display === 'none') return;
      if (HARIINI.lastFetch && Date.now() - HARIINI.lastFetch < 30 * 60 * 1000) return;
      HARIINI.fetching = true;
      setTimeout(() => { HARIINI.fetching = false; }, 30000);   // pengaman kalau auth tak kunjung siap
      const jalankan = () => {
        const ambil = (path, n) => Promise.race([
          db.ref(path).limitToLast(n).once('value'),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]).catch(() => null);
        Promise.all([ambil('kalender_akademik', 300), ambil('events', 150), ambil('ujian', 150)]).then(([k, e, u]) => {
          if (!k && !e && !u) return;
          const out = [];
          if (k) k.forEach(c => { const v = c.val() || {}; if (v.tanggalMulai) out.push({ jenis: v.jenis, judul: String(v.judul || ''), tanggalMulai: v.tanggalMulai, tanggalSelesai: v.tanggalSelesai || v.tanggalMulai, sumber: 'manual' }); });
          if (e) e.forEach(c => { const v = c.val() || {}; if (v.tanggal) out.push({ jenis: 'acara', judul: String(v.nama || ''), tanggalMulai: v.tanggal, tanggalSelesai: v.tanggal, sumber: 'acara' }); });
          if (u) u.forEach(c => { const v = c.val() || {}; if (v.tanggal) out.push({ jenis: 'ujian', judul: String(v.nama || ''), tanggalMulai: v.tanggal, tanggalSelesai: v.tanggal, sumber: 'ujian' }); });
          HARIINI.items = out; HARIINI.lastFetch = Date.now();
          hariIniSimpanCache(); hariIniRender();
        }).then(() => { HARIINI.fetching = false; }, () => { HARIINI.fetching = false; });
      };
      if (auth.currentUser) jalankan();
      else { const off = auth.onAuthStateChanged(u => { if (u) { off(); jalankan(); } }); }
    }
    function hariIniInit() {
      HARIINI.el = document.getElementById('cxHariIni');
      HARIINI.chooser = document.getElementById('loginChooser');
      if (!HARIINI.el || !HARIINI.chooser) return;
      HARIINI.emoji = HARIINI.el.querySelector('.cx-today-emoji');
      HARIINI.text = HARIINI.el.querySelector('.cx-today-text');
      hariIniMuatCache();
      hariIniRender();
      setTimeout(hariIniMuat, 1500);   // beri waktu boot memutuskan: auto-login (halaman awal disembunyikan) tidak perlu baca ini
      // Halaman awal muncul lagi (mis. setelah logout) -> segarkan; ganti hari saat app dibiarkan terbuka -> ganti ucapan.
      new MutationObserver(() => { if (HARIINI.chooser.style.display !== 'none') { hariIniRender(); hariIniMuat(); } })
        .observe(HARIINI.chooser, { attributes: true, attributeFilter: ['style'] });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (tglLokal() !== HARIINI.lastDate) hariIniRender(); hariIniMuat(); } });
      window.addEventListener('online', hariIniMuat);
      setInterval(() => { if (tglLokal() !== HARIINI.lastDate) hariIniRender(); }, 60000);
    }
    hariIniInit();
    // ===== END CHOOSER-HARIINI =====
    function simpanAgendaKalender() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      if (isBusy('simpanAgendaKalender')) return toast('Sedang menyimpan...', false, 1500);
      const jenis = document.getElementById('kalenderJenis').value;
      const judul = document.getElementById('kalenderJudul').value.trim();
      const tanggalMulai = document.getElementById('kalenderTanggalMulai').value;
      const tanggalSelesai = document.getElementById('kalenderTanggalSelesai').value || null;
      const keterangan = document.getElementById('kalenderKeterangan').value.trim();
      if (!judul || !tanggalMulai) return toast('Judul & tanggal mulai wajib diisi!', true);
      if (tanggalSelesai && tanggalSelesai < tanggalMulai) return toast('Tanggal selesai tidak boleh sebelum tanggal mulai!', true);
      const btnSimpanAgenda = document.getElementById('btnSimpanAgendaKalender');
      setBusy('simpanAgendaKalender', btnSimpanAgenda);
      const ref = db.ref('kalender_akademik').push();
      const data = { jenis, judul, tanggalMulai, tanggalSelesai, keterangan: keterangan || null, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanAgendaKalender', btnSimpanAgenda);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Agenda tersimpan!'); addLog('tambah_agenda_kalender', judul);
        allKalenderAkademik.push({ key: ref.key, ...data });
        document.getElementById('kalenderJudul').value = ''; document.getElementById('kalenderKeterangan').value = ''; document.getElementById('kalenderTanggalSelesai').value = '';
        renderKalenderAkademik();
      });
    }
    function hapusAgendaKalender(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus agenda ini?')) return;
      db.ref('kalender_akademik/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Agenda dihapus.'); addLog('hapus_agenda_kalender', key);
        allKalenderAkademik = allKalenderAkademik.filter(k => k.key !== key);
        renderKalenderAkademik();
      });
    }

