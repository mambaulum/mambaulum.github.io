// ============================================================
// jadwal.js -- JADWAL PELAJARAN (dipecah dari app.js)
// ============================================================
// Isi: tampilan jadwal harian/mingguan/per mapel, tambah/edit/hapus jadwal, ekspor PDF jadwal.
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat selain pembungkus
// pemuat PDF malas di bagian paling bawah berkas ini.
// TETAP di app.js: renderJadwalHariIni() (dashboard), getHariIni(), populateKoreksiAbsenGuruDropdown().
// ============================================================

    // ============================================================
    // JADWAL PELAJARAN
    // ============================================================
    // ===== OPSI "SEMUA KELAS" di filter kelas =====
    var JADWAL_SEMUA = '__semua';
    function jadwalAdaSemua() { return document.getElementById('jadwalKelasFilter') && document.getElementById('jadwalKelasFilter').value === JADWAL_SEMUA; }
    function jadwalPastikanOpsiSemua() {
      const sel = document.getElementById('jadwalKelasFilter'); if (!sel) return;
      if (!Array.prototype.some.call(sel.options, o => o.value === JADWAL_SEMUA)) {
        const o = document.createElement('option'); o.value = JADWAL_SEMUA; o.textContent = '📋 Semua Kelas';
        sel.insertBefore(o, sel.firstChild);
      }
    }
    function jadwalDaftarKelas() { return (typeof KELAS_LIST !== 'undefined' && KELAS_LIST.length) ? KELAS_LIST.slice() : [...new Set(allJadwal.map(j => j.kelas))].sort(COLLATOR_ID.compare); }
    function populateJadwalGuruFilter() {
      // FIX: dulu opsi filter dibangun dari SET NAMA unik (allJadwal.map(j=>j.guru)) -- kalau ada
      // 2 guru bernama sama, cuma muncul 1 opsi di dropdown ini dan memilihnya menampilkan jadwal
      // GABUNGAN keduanya (lihat renderJadwal di bawah), padahal Admin mengira sedang melihat
      // jadwal satu orang saja. Sekarang opsi dibangun per guruKey unik (fallback ke nama untuk
      // baris jadwal lama yang belum punya guruKey), value = guruKey, label tetap nama guru.
      const select = document.getElementById('jadwalGuruFilter');
      select.innerHTML = '<option value="">Semua Guru</option>';
      const seen = new Map(); // value (guruKey/nama) -> nama tampilan
      allJadwal.forEach(j => { if (!j.guru) return; const val = j.guruKey || j.guru; if (!seen.has(val)) seen.set(val, j.guru); });
      [...seen.entries()].sort((a, b) => COLLATOR_ID.compare(a[1], b[1])).forEach(([val, nama]) => {
        select.innerHTML += `<option value="${escapeHtml(val)}">${escapeHtml(nama)}</option>`;
      });
    }
    function setJadwalView(view) {
      jadwalView = view;
      { const btnH = document.getElementById('btnViewHarian'); btnH.style.background = view === 'harian' ? '#2563eb' : '#e5e7eb';
        if (view === 'harian') { btnH.style.color = 'white'; btnH.classList.remove('text-strong'); } else { btnH.style.color = ''; btnH.classList.add('text-strong'); } }
      { const btnM = document.getElementById('btnViewMingguan'); btnM.style.background = view === 'mingguan' ? '#2563eb' : '#e5e7eb';
        if (view === 'mingguan') { btnM.style.color = 'white'; btnM.classList.remove('text-strong'); } else { btnM.style.color = ''; btnM.classList.add('text-strong'); } }
      { const btnP = document.getElementById('btnViewPerMapel'); if (btnP) { btnP.style.background = view === 'permapel' ? '#2563eb' : '#e5e7eb';
        if (view === 'permapel') { btnP.style.color = 'white'; btnP.classList.remove('text-strong'); } else { btnP.style.color = ''; btnP.classList.add('text-strong'); } } }
      renderJadwal();
    }
    // Warna penanda per mata pelajaran (pastel + teks gelap, jadi terbaca di mode terang & gelap).
    // Mapel yang sama SELALU berwarna sama di semua tampilan Jadwal.
    const JADWAL_WARNA_MAPEL = [
      ['#dbeafe','#1e3a8a'], ['#dcfce7','#14532d'], ['#fef3c7','#78350f'], ['#fce7f3','#831843'],
      ['#ede9fe','#4c1d95'], ['#ffedd5','#7c2d12'], ['#cffafe','#164e63'], ['#fee2e2','#7f1d1d'],
      ['#ecfccb','#365314'], ['#e0e7ff','#312e81']
    ];
    function warnaMapel(mapel) {
      const s = String(mapel || '');
      let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return JADWAL_WARNA_MAPEL[h % JADWAL_WARNA_MAPEL.length];
    }
    // Tampilan "Per Mapel": semua mata pelajaran satu kelas sekaligus (hari & jam-nya), tidak
    // terpengaruh filter Hari maupun filter Guru -- jadi tidak perlu ganti-ganti filter untuk membaca daftarnya.
    function renderJadwalPerMapel(daftar, kelas) {
      const container = document.getElementById('jadwalTableWrapper');
      document.getElementById('jadwalPagination').innerHTML = '';
      if (!daftar.length) { container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Belum ada jadwal untuk kelas ${escapeHtml(kelas)}.</p>`; return; }
      const urutHari = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const perMapel = new Map();
      daftar.forEach(j => {
        const m = j.mapel || '-';
        if (!perMapel.has(m)) perMapel.set(m, []);
        perMapel.get(m).push(j);
      });
      const baris = [...perMapel.entries()].sort((a, b) => COLLATOR_ID.compare(a[0], b[0]));
      let html = `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">📚 Semua mata pelajaran kelas <strong>${escapeHtml(kelas)}</strong> (filter Hari &amp; Guru tidak berlaku di tampilan ini).</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f3f4f6;"><th style="padding:10px 12px;text-align:left;">Mata Pelajaran</th><th style="padding:10px 12px;text-align:left;">Guru</th><th style="padding:10px 12px;text-align:left;">Hari &amp; Jam</th><th style="padding:10px 12px;text-align:center;">Jam/minggu</th></tr></thead><tbody>`;
      baris.forEach(([mapel, items]) => {
        const [bg, fg] = warnaMapel(mapel);
        const guruUnik = [...new Set(items.map(j => j.guru || '-'))];
        const perHari = urutHari.map(h => {
          const jam = items.filter(j => j.hari === h).map(j => j.jam).filter(Boolean).sort((a, b) => a - b);
          return jam.length ? `<span style="display:inline-block;margin:2px 6px 2px 0;white-space:nowrap;"><strong>${h}</strong> jam ${jam.join(', ')}</span>` : '';
        }).join('');
        html += `<tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:8px 12px;"><span style="display:inline-block;padding:3px 10px;border-radius:8px;font-weight:600;background:${bg};color:${fg};">${escapeHtml(mapel)}</span></td>
          <td style="padding:8px 12px;">${guruUnik.map(g => escapeHtml(g)).join('<br>')}</td>
          <td style="padding:8px 12px;">${perHari || '-'}</td>
          <td style="padding:8px 12px;text-align:center;font-weight:600;">${items.length}</td></tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
    }
    function renderJadwal() {
      const kelas = document.getElementById('jadwalKelasFilter').value;
      const hari = document.getElementById('jadwalHariFilter').value;
      const filterGuru = document.getElementById('jadwalGuruFilter').value;
      const container = document.getElementById('jadwalTableWrapper');
      const isAdminUser = isAdmin();
      jadwalPastikanOpsiSemua();

      document.getElementById('btnTambahJadwal').style.display = isAdminUser ? 'inline-flex' : 'none';

      if (kelas === JADWAL_SEMUA) { renderJadwalSemuaKelas(hari, filterGuru); return; }
      let filtered = allJadwal.filter(j => j.kelas === kelas);
      if (jadwalView === 'permapel') { renderJadwalPerMapel(filtered, kelas); return; }
      if (filterGuru) {
        filtered = filtered.filter(j => (j.guruKey || j.guru) === filterGuru);
      }

      if (jadwalView === 'mingguan') {
        // Label tampilan pakai NAMA guru (dari teks opsi terpilih), sedangkan filterGuru sendiri
        // (guruKey) tetap dipakai untuk pencocokan data -- supaya tidak menampilkan guruKey mentah
        // ("-Nabc123...") ke Admin di pesan "Menampilkan jadwal untuk guru: ...".
        const guruSelect = document.getElementById('jadwalGuruFilter');
        const filterGuruNama = guruSelect && guruSelect.selectedIndex > 0 ? guruSelect.options[guruSelect.selectedIndex].textContent : '';
        renderJadwalMingguan(filtered, kelas, filterGuruNama);
        return;
      }

      filtered = filtered.filter(j => j.hari === hari);
      filtered.sort((a, b) => (a.jam || 0) - (b.jam || 0));

      if (filtered.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada jadwal untuk filter ini.</p>`;
        document.getElementById('jadwalPagination').innerHTML = '';
        return;
      }

      const totalItems = filtered.length;
      const ps = pagerSize('jadwal') || totalItems || 1, totalPages = Math.max(1, Math.ceil(totalItems / ps));
      if (jadwalPage > totalPages) jadwalPage = totalPages;
      if (jadwalPage < 1) jadwalPage = 1;
      const start = (jadwalPage - 1) * ps;
      const end = Math.min(start + ps, totalItems);
      const pageItems = filtered.slice(start, end);

      let html = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;">Jam ke-</th>
            <th style="padding:10px 12px;text-align:left;">Waktu</th>
            <th style="padding:10px 12px;text-align:left;">Mata Pelajaran</th>
            <th style="padding:10px 12px;text-align:left;">Guru</th>
            ${isAdminUser ? `<th style="padding:10px 12px;text-align:center;width:100px;">Aksi</th>` : ''}
          </tr>
        </thead>
        <tbody>`;

      pageItems.forEach(j => {
        const jamKe = j.jam || '-';
        const waktu = jamSettings[jamKe] ? `${jamSettings[jamKe].mulai} - ${jamSettings[jamKe].selesai}` : '-';
        const mapel = j.mapel || '-';
        const guru = j.guru || '-';
        const btnEdit = isAdminUser ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editJadwal('${j.key}')">✏️</button>` : '';
        const btnDel = isAdminUser ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusJadwal('${j.key}')">🗑️</button>` : '';
        html += `<tr class="jadwal-item">
          <td style="padding:8px 12px;font-weight:600;">${jamKe}</td>
          <td class="text-medium" style="padding:8px 12px;">${waktu}</td>
          <td style="padding:8px 12px;">${escapeHtml(mapel)}</td>
          <td style="padding:8px 12px;">${escapeHtml(guru)}</td>
          ${isAdminUser ? `<td style="padding:8px 12px;text-align:center;" class="jadwal-actions">${btnEdit} ${btnDel}</td>` : ''}
        </tr>`;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;

      const paginationEl = document.getElementById('jadwalPagination');
      paginationEl.innerHTML = pagerHtml('jadwal', totalItems, totalPages, start, end, 'jadwal');
    }
    // Tampilan SEMUA KELAS. Harian = satu tabel (kolom Kelas) untuk hari terpilih; Mingguan & Per Mapel = blok per kelas.
    function renderJadwalSemuaKelas(hari, filterGuru) {
      const container = document.getElementById('jadwalTableWrapper'), pag = document.getElementById('jadwalPagination');
      const isAdminUser = isAdmin(), kelasList = jadwalDaftarKelas();
      const guruSelect = document.getElementById('jadwalGuruFilter');
      const filterGuruNama = guruSelect && guruSelect.selectedIndex > 0 ? guruSelect.options[guruSelect.selectedIndex].textContent : '';
      const pakaiGuru = j => !filterGuru || (j.guruKey || j.guru) === filterGuru;
      if (jadwalView === 'harian') {
        const urutKelas = k => { const i = kelasList.indexOf(k); return i < 0 ? 999 : i; };
        const filtered = allJadwal.filter(j => j.hari === hari && pakaiGuru(j)).sort((a, b) => urutKelas(a.kelas) - urutKelas(b.kelas) || (a.jam || 0) - (b.jam || 0));
        if (!filtered.length) { container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada jadwal untuk filter ini.</p>'; pag.innerHTML = ''; return; }
        const ps = pagerSize('jadwal') || filtered.length || 1, totalPages = Math.max(1, Math.ceil(filtered.length / ps));
        if (jadwalPage > totalPages) jadwalPage = totalPages; if (jadwalPage < 1) jadwalPage = 1;
        const start = (jadwalPage - 1) * ps, end = Math.min(start + ps, filtered.length);
        let html = `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">📋 Semua kelas &bull; hari <strong>${escapeHtml(hari)}</strong></p><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#f3f4f6;"><th style="padding:10px 12px;text-align:left;">Kelas</th><th style="padding:10px 12px;text-align:left;">Jam ke-</th><th style="padding:10px 12px;text-align:left;">Waktu</th><th style="padding:10px 12px;text-align:left;">Mata Pelajaran</th><th style="padding:10px 12px;text-align:left;">Guru</th>${isAdminUser ? '<th style="padding:10px 12px;text-align:center;width:100px;">Aksi</th>' : ''}</tr></thead><tbody>`;
        filtered.slice(start, end).forEach(j => {
          const waktu = jamSettings[j.jam] ? `${jamSettings[j.jam].mulai} - ${jamSettings[j.jam].selesai}` : '-';
          const aksi = isAdminUser ? `<td style="padding:8px 12px;text-align:center;" class="jadwal-actions"><button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editJadwal('${j.key}')">✏️</button> <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusJadwal('${j.key}')">🗑️</button></td>` : '';
          html += `<tr class="jadwal-item"><td style="padding:8px 12px;font-weight:600;">${escapeHtml(j.kelas || '-')}</td><td style="padding:8px 12px;font-weight:600;">${j.jam || '-'}</td><td class="text-medium" style="padding:8px 12px;">${waktu}</td><td style="padding:8px 12px;">${escapeHtml(j.mapel || '-')}</td><td style="padding:8px 12px;">${escapeHtml(j.guru || '-')}</td>${aksi}</tr>`;
        });
        container.innerHTML = html + '</tbody></table></div>';
        pag.innerHTML = pagerHtml('jadwal', filtered.length, totalPages, start, end, 'jadwal');
        return;
      }
      // Mingguan / Per Mapel: gambar tiap kelas dengan fungsi tampilan satu-kelas yang sama, lalu gabungkan.
      let gabung = '';
      kelasList.forEach(k => {
        const dk = allJadwal.filter(j => j.kelas === k);
        if (jadwalView === 'permapel') renderJadwalPerMapel(dk, k);
        else renderJadwalMingguan(dk.filter(pakaiGuru), k, filterGuruNama);
        gabung += `<h4 style="margin:18px 0 8px;">${escapeHtml(k)}</h4>` + container.innerHTML;
      });
      container.innerHTML = gabung; pag.innerHTML = '';
    }
    function renderJadwalMingguan(filtered, kelas, filterGuru) {
      const container = document.getElementById('jadwalTableWrapper');
      const isAdminUser = isAdmin();

      const hariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      // Admin (tanpa filter guru) melihat SEMUA hari & SEMUA jam dari pengaturan jam, supaya ➕ bisa dipakai juga
      // untuk hari/jam yang belum punya jadwal sama sekali (mis. Sabtu, atau jam ke-6). Pengguna lain &
      // tampilan terfilter guru tetap ringkas: hanya hari/jam yang terisi.
      const tampilGridPenuh = isAdminUser && !filterGuru;
      const hariList = tampilGridPenuh ? hariOrder : hariOrder.filter(h => filtered.some(j => j.hari === h));

      if (hariList.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada jadwal untuk kelas ${escapeHtml(kelas)}${filterGuru ? ' dengan guru '+escapeHtml(filterGuru) : ''}.</p>`;
        document.getElementById('jadwalPagination').innerHTML = '';
        return;
      }

      const jamSet = new Set();
      filtered.forEach(j => { if (j.jam) jamSet.add(j.jam); });
      if (tampilGridPenuh) Object.keys(jamSettings || {}).forEach(k => { const n = parseInt(k, 10); if (n > 0) jamSet.add(n); });
      const jamList = [...jamSet].sort((a,b) => a-b);

      if (jamList.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada data jam.</p>`;
        return;
      }

      let html = `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 10px;text-align:center;min-width:70px;">Jam ke-</th>
              ${hariList.map(h => `<th style="padding:8px 10px;text-align:center;min-width:100px;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

      jamList.forEach(jam => {
        html += `<tr>`;
        const waktu = jamSettings[jam] ? `${jamSettings[jam].mulai} - ${jamSettings[jam].selesai}` : `Jam ${jam}`;
        html += `<td style="padding:8px 10px;font-weight:600;text-align:center;">${jam}<br><span class="text-muted" style="font-size:10px;">${waktu}</span></td>`;

        hariList.forEach(hari => {
          const jadwal = filtered.find(j => j.jam === jam && j.hari === hari);
          if (jadwal) {
            const [wBg, wFg] = warnaMapel(jadwal.mapel);
            html += `<td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;background:${wBg};color:${wFg};min-width:120px;">
              <div style="font-weight:700;font-size:13px;line-height:1.3;">${escapeHtml(jadwal.mapel || '-')}</div>
              <div style="font-size:12px;margin-top:2px;opacity:.9;">${escapeHtml(jadwal.guru || '-')}</div>
            </td>`;
          } else {
            // Slot kosong: tombol ➕ per SEL (hari & jam sel itu sendiri). `filtered` bisa sudah disaring
            // per guru, jadi sel "kosong" belum tentu kosong di kelas -- cek ke allJadwal (semua guru).
            const slotTerisi = allJadwal.some(j => j.kelas === kelas && j.hari === hari && j.jam === jam);
            if (isAdminUser && !slotTerisi) {
              html += `<td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;"><button class="btn btn-edit" style="padding:2px 8px;font-size:10px;" title="Tambah jadwal ${hari} jam ke-${jam}" onclick="tambahJadwalCepat('${escapeJs(kelas)}', '${escapeJs(hari)}', ${jam})">➕</button></td>`;
            } else {
              html += `<td class="text-muted" style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;">-</td>`;
            }
          }
        });
        html += `</tr>`;
      });

      html += `</tbody></table></div>`;

      if (filterGuru) {
        html += `<p class="text-muted" style="font-size:12px;margin-top:8px;">📌 Menampilkan jadwal untuk guru: <strong>${filterGuru}</strong></p>`;
      }

      container.innerHTML = html;
      document.getElementById('jadwalPagination').innerHTML = '';
    }
    function tambahJadwalCepat(kelas, hari, jam) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '➕ Tambah Jadwal';
      document.getElementById('editJadwalKey').value = '';
      document.getElementById('jadwalFormKelas').value = kelas;
      document.getElementById('jadwalFormHari').value = hari;
      document.getElementById('jadwalFormJam').value = jam;
      document.getElementById('jadwalFormMapel').value = '';
      document.getElementById('jadwalFormGuru').value = '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function loadJadwal() {
      db.ref('jadwal').once('value', snap => {
        allJadwal = [];
        snap.forEach(child => {
          const j = child.val();
          j.key = child.key;
          allJadwal.push(j);
        });
        populateJadwalGuruFilter();
        renderJadwal();
        populateGuruDropdown();
        renderJadwalHariIni();
      });
    }
    function populateGuruDropdown() {
      // FIX: value dulu = nama guru -> kalau ada 2 guru dengan nama sama persis (kembar/senama),
      // sistem jadwal (bentrok-cek, "Jadwal Hari Ini" di dashboard) tidak bisa membedakan
      // keduanya sama sekali, sehingga jadwal salah satunya bisa "ketimpa" tampil punya yang lain.
      // Sekarang value = KEY unik guru (g.key), nama cuma jadi label tampilan. Guru tanpa key
      // (data lama) tetap fallback ke nama supaya tidak hilang dari daftar.
      const select = document.getElementById('jadwalFormGuru');
      select.innerHTML = '<option value="">-- Pilih Guru --</option>';
      allGuru.sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      allGuru.forEach(g => { const val = g.key || g.name; select.innerHTML += `<option value="${escapeHtml(val)}" data-nama="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`; });
    }
    function showTambahJadwal() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '➕ Tambah Jadwal';
      document.getElementById('editJadwalKey').value = '';
      { const kf = document.getElementById('jadwalKelasFilter').value; document.getElementById('jadwalFormKelas').value = kf === JADWAL_SEMUA ? (jadwalDaftarKelas()[0] || '') : kf; }
      document.getElementById('jadwalFormHari').value = document.getElementById('jadwalHariFilter').value;
      document.getElementById('jadwalFormJam').value = '1';
      document.getElementById('jadwalFormMapel').value = '';
      document.getElementById('jadwalFormGuru').value = '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function simpanJadwal() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('simpanJadwal')) return toast('Sedang menyimpan...', false, 1500);
      const key = document.getElementById('editJadwalKey').value, kelas = document.getElementById('jadwalFormKelas').value, hari = document.getElementById('jadwalFormHari').value, jam = parseInt(document.getElementById('jadwalFormJam').value), mapel = document.getElementById('jadwalFormMapel').value;
      const guruSelect = document.getElementById('jadwalFormGuru');
      const guruOpt = guruSelect.options[guruSelect.selectedIndex];
      const guruValue = guruSelect.value; // key guru (atau nama, fallback utk guru tanpa key)
      const guru = guruOpt && guruOpt.dataset.nama ? guruOpt.dataset.nama : guruValue; // nama utk tampilan
      const guruDipilih = (allGuru || []).find(g => (g.key || g.name) === guruValue);
      const guruKey = guruDipilih ? (guruDipilih.key || null) : null;
      if (!kelas || !hari || !jam || !mapel || !guruValue) return toast('Semua field wajib diisi!', true);
      const existing = allJadwal.find(j => j.kelas === kelas && j.hari === hari && j.jam === jam && j.key !== key);
      if (existing) return toast(`⚠️ Jadwal ${kelas} - ${hari} jam ke-${jam} sudah terisi!`, true);
      // ===== VALIDASI TAMBAHAN: guru yang sama tidak boleh dijadwalkan di KELAS LAIN pada
      // hari & jam yang sama -- sebelumnya hanya slot (kelas+hari+jam) yang dicek, jadi Admin
      // bisa tanpa sadar menjadwalkan satu guru mengajar 2 kelas sekaligus di jam yang sama
      // (yang secara fisik tidak mungkin dilakukan guru tersebut).
      // FIX: dulu dicocokkan lewat NAMA (j.guru === guru) -- kalau ada 2 guru bernama sama,
      // jadwal guru A dianggap "bentrok" dengan jadwal guru B yang sebenarnya orang lain, dan
      // "Jadwal Hari Ini" di dashboard ikut mencampur jadwal keduanya. Sekarang dicocokkan lewat
      // guruKey (unik per guru); fallback ke nama hanya kalau guru itu memang tidak punya key.
      const cocokGuruSama = j => guruKey ? (j.guruKey === guruKey || (!j.guruKey && samaNamaGuru(j.guru, guru))) : (!j.guruKey && samaNamaGuru(j.guru, guru));
      const bentrokGuru = allJadwal.find(j => cocokGuruSama(j) && j.hari === hari && j.jam === jam && j.key !== key && j.kelas !== kelas);
      if (bentrokGuru) return toast(`⚠️ ${guru} sudah dijadwalkan mengajar ${bentrokGuru.kelas} pada ${hari} jam ke-${jam}! Satu guru tidak bisa mengajar 2 kelas di jam yang sama.`, true);
      const data = { kelas, hari, jam, mapel, guru, guruKey: guruKey || null, updatedAt: new Date().toISOString() };
      const ref = key ? db.ref('jadwal/' + key) : db.ref('jadwal').push();
      const btnSimpanJadwal = document.getElementById('btnSimpanJadwal');
      setBusy('simpanJadwal', btnSimpanJadwal);
      ref.set(data, err => {
        clearBusy('simpanJadwal', btnSimpanJadwal);
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Jadwal tersimpan!'); addLog('simpan_jadwal', `${kelas} - ${hari} - Jam ${jam} - ${mapel}`); batalJadwal(); loadJadwal(); }
      });
    }
    function editJadwal(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const j = allJadwal.find(item => item.key === key);
      if (!j) return toast('Jadwal tidak ditemukan!', true);
      document.getElementById('editJadwalKey').value = key;
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '✏️ Edit Jadwal';
      document.getElementById('jadwalFormKelas').value = j.kelas;
      document.getElementById('jadwalFormHari').value = j.hari;
      document.getElementById('jadwalFormJam').value = j.jam || 1;
      document.getElementById('jadwalFormMapel').value = j.mapel || '';
      document.getElementById('jadwalFormGuru').value = j.guruKey || j.guru || '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function batalJadwal() { document.getElementById('jadwalFormContainer').style.display = 'none'; document.getElementById('editJadwalKey').value = ''; }
    function hapusJadwal(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus jadwal ini?')) return;
      db.ref('jadwal/' + key).remove(err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Jadwal dihapus.'); addLog('hapus_jadwal', 'Jadwal dihapus'); loadJadwal(); }
      });
    }
    function exportJadwalPDF() {
      const kelas = document.getElementById('jadwalKelasFilter').value, hari = document.getElementById('jadwalHariFilter').value;
      const semua = kelas === JADWAL_SEMUA, kl = jadwalDaftarKelas(), urutK = k => { const i = kl.indexOf(k); return i < 0 ? 999 : i; };
      const filtered = allJadwal.filter(j => (semua || j.kelas === kelas) && j.hari === hari);
      filtered.sort((a, b) => (semua ? urutK(a.kelas) - urutK(b.kelas) : 0) || (a.jam || 0) - (b.jam || 0));
      if (filtered.length === 0) return toast(`Tidak ada jadwal untuk ${semua ? 'semua kelas' : kelas} - ${hari}`, true);
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18); doc.text('JADWAL PELAJARAN', pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(14); doc.text(`${semua ? 'Semua Kelas' : 'Kelas ' + kelas} - ${hari}`, pageWidth/2, 30, { align: 'center' });
      doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, 38, { align: 'right' });
      doc.line(20, 42, pageWidth - 20, 42);
      const rows = filtered.map(j => { const waktu = jamSettings[j.jam] ? `${jamSettings[j.jam].mulai} - ${jamSettings[j.jam].selesai}` : '-'; const b = [`Jam ke-${j.jam}`, waktu, j.mapel || '-', j.guru || '-']; return semua ? [j.kelas || '-'].concat(b) : b; });
      doc.autoTable({ startY: 48, head: [semua ? ['Kelas', 'Jam ke-', 'Waktu', 'Mata Pelajaran', 'Guru'] : ['Jam ke-', 'Waktu', 'Mata Pelajaran', 'Guru']], body: rows, theme: 'striped', styles: { fontSize: 10 }, headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontSize: 11, fontStyle: 'bold' }, margin: { left: 15, right: 15 } });
      doc.save(`Jadwal_${semua ? 'Semua_Kelas' : kelas}_${hari}.pdf`); toast('📥 Jadwal berhasil diunduh!');
    }

// Pembungkus pemuat PDF malas (fungsi pembungkusnya didefinisikan di app.js, bagian "EXPORT PDF/EXCEL").
if (typeof simambaBungkusExportLazy === 'function') simambaBungkusExportLazy([['exportJadwalPDF', 'pdf', 'PDF']]);

// Opsi "Semua Kelas" ikut dipasang kembali setiap kali app.js membangun ulang dropdown kelas.
if (typeof refreshAllKelasDropdowns === 'function') {
  const _refreshAsli = refreshAllKelasDropdowns;
  refreshAllKelasDropdowns = function () { const r = _refreshAsli.apply(this, arguments); try { jadwalPastikanOpsiSemua(); } catch (e) {} return r; };
}
