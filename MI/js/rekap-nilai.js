// ============================================================
// rekap-nilai.js -- REKAP NILAI (dipecah dari app.js, tahap 6)
// ============================================================
// Isi: filter & tabel Rekap Absensi/Nilai (renderRekap, renderRekapNilai per kelas/per siswa), cache rekap nilai,
// ekspor Rekap Nilai ke PDF dan Excel.
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat selain pembungkus
// pemuat PDF/Excel malas di bagian paling bawah berkas ini.
// TETAP di app.js: rekapNilaiDataCache (state), calculateRapor(), renderGrades()/saveGrades() (Input Nilai).
// ============================================================

    // Tampilkan nilai apa adanya; hanya yang KOSONG ditulis "-". Nilai 0 asli tetap tampil "0"
    // (sebelumnya `x || '-'` membuat nilai 0 ikut tampil "-").
    function fmtNilai(v) {
      return (v === undefined || v === null || String(v).trim() === '') ? '-' : v;
    }

    // [Dipindah ke js/honor-guru.js] honorSholat* (hitung honor sholat dari check-in).


    // ============================================================
    // REKAP
    // ============================================================
    function populateRekapFilters() {
      // FIX: dulu value = nama -- 2 guru bernama sama otomatis "digabung" jadi satu baris rekap
      // (lihat renderRekap: grouped[...] dikunci pakai NAMA). Sekarang value = guruKey (fallback
      // nama untuk guru lama yang belum punya key), label tampilan tetap nama.
      const select = document.getElementById('rekapFilterGuru');
      select.innerHTML = '<option value="">Semua Guru</option>';
      allGuru.forEach(g => { select.innerHTML += `<option value="${escapeHtml(g.key || g.name)}">${escapeHtml(g.name)}</option>`; });
    }
    function renderRekap() {
      if (!currentUser) return; if (!isAdmin() && !isKepsek()) return;
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value, filterTanggal = document.getElementById('rekapFilterTanggal').value;
      let guruList = allGuru, siswaList = allSiswa, journalList = allJournals.filter(j => j.status !== 'ditolak'), attendanceList = allTeacherAttendance;
      // FIX: dulu filterGuru & pengelompokan rekap sama-sama pakai NAMA guru -- kalau ada 2 guru
      // bernama sama, memilih salah satu di filter menampilkan data GABUNGAN keduanya, dan tanpa
      // filter pun rekap per-guru di bawah menggabung jurnal/absen/siswa keduanya jadi satu baris
      // (grouped dikunci pakai nama). Sekarang dicocokkan & dikelompokkan pakai guruKey (fallback
      // nama untuk guru/records lama yang belum punya guruKey).
      const uidGuru = g => g.key || g.name;
      const uidRec = r => r.guruKey || r.guru;
      // FIX 2: siswaList (wali kelas) cuma simpan NAMA guru, tidak ada guruKey. Kalau langsung
      // dikelompokkan pakai s.guru (nama mentah) sementara jurnal/absen/guru dikelompokkan pakai
      // guruKey, maka guru yang SUDAH punya guruKey akan pecah jadi 2 baris: satu grup key=nama
      // (isinya cuma siswa wali kelas), satu grup key=guruKey (isinya jurnal/absen). Makanya
      // resolve dulu nama -> guruKey lewat allGuru sebelum dipakai sebagai key grup.
      const namaGuruToKeyRekap = {};
      (allGuru || []).forEach(g => { if (g.key) namaGuruToKeyRekap[g.name] = g.key; });
      const uidSiswaGuru = s => namaGuruToKeyRekap[s.guru] || s.guru;
      // Data siswa (wali kelas) cuma menyimpan NAMA guru, tidak ada guruKey sama sekali (beda
      // fitur dari jadwal/jurnal/absensi guru) -- jadi filterGuru (sekarang berisi guruKey) perlu
      // di-resolve balik ke nama supaya pencocokan s.guru tetap jalan. Catatan: ini artinya
      // filter siswa tetap belum bisa membedakan 2 guru kembar sebagai wali kelas -- itu perlu
      // field guruKey baru di data siswa sendiri (di luar cakupan perbaikan jadwal ini).
      const filterGuruNama = filterGuru ? ((allGuru || []).find(g => uidGuru(g) === filterGuru)?.name || filterGuru) : '';
      if (filterGuru) { guruList = guruList.filter(g => uidGuru(g) === filterGuru); siswaList = siswaList.filter(s => s.guru === filterGuruNama); journalList = journalList.filter(j => uidRec(j) === filterGuru); attendanceList = attendanceList.filter(a => uidRec(a) === filterGuru); }
      if (filterKelas) { siswaList = siswaList.filter(s => s.kelas === filterKelas); journalList = journalList.filter(j => j.kelas === filterKelas); attendanceList = attendanceList.filter(a => a.kelas && a.kelas.includes(filterKelas)); }
      if (filterTanggal) { journalList = journalList.filter(j => j.tanggal === filterTanggal); attendanceList = attendanceList.filter(a => a.tanggal === filterTanggal); }
      document.getElementById('rekapTotalGuru').textContent = guruList.length;
      document.getElementById('rekapTotalSiswa').textContent = siswaList.length;
      document.getElementById('rekapTotalJurnal').textContent = journalList.length;
      const today = filterTanggal || tglLokal();
      const hadirToday = allTeacherAttendance.filter(a => a.tanggal === today);
      document.getElementById('rekapGuruHadir').textContent = new Set(hadirToday.filter(a => a.type === 'Datang').map(a => a.guruKey || a.guru)).size;
      const list = document.getElementById('rekapList');
      list.innerHTML = '';
      const grouped = {};
      siswaList.forEach(s => { const uid = uidSiswaGuru(s); if (!grouped[uid]) grouped[uid] = { nama: s.guru, siswa: [], jurnal: [], absen: 0 }; grouped[uid].siswa.push(s); });
      journalList.forEach(j => { const uid = uidRec(j); if (!grouped[uid]) grouped[uid] = { nama: j.guru, siswa: [], jurnal: [], absen: 0 }; grouped[uid].jurnal.push(j); });
      attendanceList.forEach(a => { const uid = uidRec(a); if (grouped[uid] && a.type === 'Datang') { (grouped[uid]._hari = grouped[uid]._hari || new Set()).add(a.tanggal); grouped[uid].absen = grouped[uid]._hari.size; } });
      guruList.forEach(g => { const uid = uidGuru(g); if (!grouped[uid]) grouped[uid] = { nama: g.name, siswa: [], jurnal: [], absen: 0 }; });
      const entries = Object.entries(grouped);
      if (entries.length === 0) { list.innerHTML = '<p class="text-muted">Tidak ada data yang sesuai filter.</p>'; document.getElementById('rekapPagination').innerHTML = ''; return; }
      const totalItems = entries.length, ps = pagerSize('rekap') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems/ps));
      if (rekapPage > totalPages) rekapPage = totalPages; if (rekapPage < 1) rekapPage = 1;
      const start = (rekapPage-1)*ps, end = Math.min(start+ps, totalItems), pageItems = entries.slice(start,end);
      let html = '';
      for (const [, data] of pageItems) {
        const guruName = data.nama;
        const kelasList = [...new Set(data.siswa.map(s=>s.kelas))].join(', ') || '-';
        html += `<div style="background:white;border-radius:12px;padding:16px;border-left:4px solid #2E7D32;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:start;gap:8px;">
            <div><div class="text-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Guru</div><div style="font-size:18px;font-weight:700;">${escapeHtml(guruName)}</div><div class="text-muted" style="font-size:14px;">Kelas: ${escapeHtml(kelasList)}</div></div>
            <div style="display:flex;gap:16px;font-size:14px;"><div><span style="font-weight:700;">${data.siswa.length}</span> Siswa</div><div><span style="font-weight:700;">${data.jurnal.length}</span> Jurnal</div><div><span style="font-weight:700;">${data.absen || 0}</span> Hadir</div></div>
          </div>
          ${data.jurnal.slice(0,3).map(j => `<div class="text-medium" style="font-size:14px;margin-top:4px;">📓 ${escapeHtml(j.tanggal)} - ${escapeHtml(j.subject)}: ${escapeHtml(j.activity.substring(0,50))}${j.activity.length > 50 ? '...' : ''}</div>`).join('')}
          ${data.jurnal.length > 3 ? `<div class="text-muted" style="font-size:12px;margin-top:4px;">+ ${data.jurnal.length - 3} jurnal lainnya</div>` : ''}
        </div>`;
      }
      list.innerHTML = html;
      document.getElementById('rekapPagination').innerHTML = pagerHtml('rekap', totalItems, totalPages, start, end, 'guru');
    }

    // ============================================================
    // REKAP NILAI
    // ============================================================
    // Record nilai yang SEMUA kolomnya kosong (dulu terbentuk otomatis setiap guru menekan Simpan untuk seluruh siswa)
    // dianggap "belum ada nilai": tidak ditampilkan sebagai 0 dan tidak ikut dihitung.
    function rekapAdaIsi(data) {
      if (!data) return false;
      return ['h1','h2','h3','mid','pas'].some(f => data[f] !== undefined && data[f] !== null && String(data[f]).trim() !== '');
    }
    function renderRekapNilai() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value, siswaKey = document.getElementById('rekapNilaiSiswa').value;
      document.getElementById('rekapNilaiSiswaContainer').style.display = view === 'siswa' ? 'block' : 'none';
      if (view === 'siswa') renderRekapPerSiswa(kelas, semester, siswaKey);
      else renderRekapPerKelas(kelas, semester);
    }
    function renderRekapPerKelas(kelas, semester) {
      const thead = document.getElementById('rekapNilaiHead'), tbody = document.getElementById('rekapNilaiBody'), tfoot = document.getElementById('rekapNilaiFoot'), info = document.getElementById('rekapNilaiInfo');
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      if (siswa.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Tidak ada siswa di kelas ${escapeHtml(kelas)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const grades = allGrades.filter(g => g.kelas === kelas && g.semester === semester && rekapAdaIsi(g.data));
      const subjects = [...new Set(grades.map(g => g.subject))].sort();
      if (subjects.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Belum ada nilai untuk kelas ${escapeHtml(kelas)} semester ${escapeHtml(semester)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const nilaiMap = {}, sementaraMap = {};
      grades.forEach(g => {
        if (!nilaiMap[g.siswaKey]) { nilaiMap[g.siswaKey] = {}; sementaraMap[g.siswaKey] = {}; }
        if (g.data) {
          const st = statusRapor(g.data);
          if (st.nilai !== null) { nilaiMap[g.siswaKey][g.subject] = st.nilai; if (!st.final) sementaraMap[g.siswaKey][g.subject] = true; }
        }
      });
      rekapNilaiDataCache = { siswa, subjects, nilaiMap, sementaraMap, semester, kelas };
      let headerHtml = `<tr><th style="text-align:center;width:30px;">No</th><th style="text-align:left;min-width:120px;">Nama Siswa</th>`;
      subjects.forEach(sub => { headerHtml += `<th style="text-align:center;min-width:60px;">${escapeHtml(sub)}</th>`; });
      headerHtml += `<th style="text-align:center;min-width:70px;">Rata-rata</th></tr>`;
      thead.innerHTML = headerHtml;
      let bodyHtml = '', totalNilaiPerMapel = {}, jumlahSiswa = 0;
      siswa.forEach((s, idx) => {
        const nilai = nilaiMap[s.key] || {}; let totalSiswa = 0, countSiswa = 0, adaSemSiswa = false; let rowHtml = `<tr class="rekap-row"><td style="text-align:center;">${idx + 1}</td><td style="text-align:left;">${escapeHtml(s.name)}</td>`;
        subjects.forEach(sub => {
          const n = nilai[sub];
          if (n !== undefined && n !== null && n !== '') {
            const num = Number(n); const sem = !!(sementaraMap[s.key] && sementaraMap[s.key][sub]);
            const color = sem ? '' : (num >= 75 ? 'nilai-hadir' : (num < 60 ? 'nilai-rendah' : ''));
            rowHtml += sem ? `<td>${raporSementaraHtml(num)}</td>` : `<td class="${color}">${num}</td>`; totalSiswa += num; countSiswa++; if (sem) adaSemSiswa = true;
            if (!totalNilaiPerMapel[sub]) totalNilaiPerMapel[sub] = { total: 0, count: 0, sem: false };
            totalNilaiPerMapel[sub].total += num; totalNilaiPerMapel[sub].count += 1; if (sem) totalNilaiPerMapel[sub].sem = true;
          } else rowHtml += `<td class="text-muted">-</td>`;
        });
        const rataSiswa = countSiswa > 0 ? (totalSiswa / countSiswa) : 0;
        const colorRata = adaSemSiswa ? '' : (rataSiswa >= 75 ? 'nilai-hadir' : (rataSiswa < 60 ? 'nilai-rendah' : ''));
        rowHtml += rataSiswa > 0 && adaSemSiswa
          ? `<td style="font-weight:700;">${raporSementaraHtml(Math.round(rataSiswa))}</td></tr>`
          : `<td class="${colorRata}" style="font-weight:700;">${rataSiswa > 0 ? Math.round(rataSiswa) : '-'}</td></tr>`;
        bodyHtml += rowHtml; jumlahSiswa++;
      });
      tbody.innerHTML = bodyHtml;
      let footHtml = `<tr class="rata-rata-row"><td colspan="2" style="text-align:right;font-weight:700;">Rata-rata Kelas</td>`;
      let totalRataKelas = 0, countRataKelas = 0, adaSemKelas = false;
      subjects.forEach(sub => {
        const data = totalNilaiPerMapel[sub];
        if (data && data.count > 0) { const rata = Math.round(data.total / data.count); footHtml += data.sem ? `<td style="font-weight:700;">${raporSementaraHtml(rata)}</td>` : `<td style="font-weight:700;">${rata}</td>`; totalRataKelas += rata; countRataKelas++; if (data.sem) adaSemKelas = true; }
        else footHtml += `<td class="text-muted">-</td>`;
      });
      const rataKelas = countRataKelas > 0 ? Math.round(totalRataKelas / countRataKelas) : 0;
      footHtml += rataKelas > 0 && adaSemKelas ? `<td style="font-weight:700;">${raporSementaraHtml(rataKelas)}</td></tr>` : `<td style="font-weight:700;color:#059669;">${rataKelas > 0 ? rataKelas : '-'}</td></tr>`;
      tfoot.innerHTML = footHtml;
      info.textContent = `📊 ${jumlahSiswa} siswa, ${subjects.length} mata pelajaran | Semester ${semester}`;
    }
    function renderRekapPerSiswa(kelas, semester, siswaKey) {
      const thead = document.getElementById('rekapNilaiHead'), tbody = document.getElementById('rekapNilaiBody'), tfoot = document.getElementById('rekapNilaiFoot'), info = document.getElementById('rekapNilaiInfo');
      const select = document.getElementById('rekapNilaiSiswa');
      const siswaList = allSiswa.filter(s => s.kelas === kelas);
      if (siswaList.length === 0) { select.innerHTML = '<option value="">-- Tidak ada siswa --</option>'; thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Tidak ada siswa di kelas ${escapeHtml(kelas)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      siswaList.forEach(s => { select.innerHTML += `<option value="${s.key}" ${s.key === siswaKey ? 'selected' : ''}>${escapeHtml(s.name)}</option>`; });
      if (!siswaKey) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Pilih siswa untuk melihat rekap nilai.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Siswa tidak ditemukan.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const grades = allGrades.filter(g => g.siswaKey === siswaKey && g.semester === semester && rekapAdaIsi(g.data));
      if (grades.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Belum ada nilai untuk ${escapeHtml(siswa.name)} semester ${semester}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      thead.innerHTML = `<tr><th style="text-align:center;">No</th><th style="text-align:left;">Mata Pelajaran</th><th style="text-align:center;">NH1</th><th style="text-align:center;">NH2</th><th style="text-align:center;">NH3</th><th style="text-align:center;">MID</th><th style="text-align:center;">PAS</th><th style="text-align:center;font-weight:700;">Rapor</th></tr>`;
      let bodyHtml = '', totalRapor = 0, countRapor = 0, adaSementara = false;
      grades.forEach((g, idx) => {
        const data = g.data || {}, h1 = fmtNilai(data.h1), h2 = fmtNilai(data.h2), h3 = fmtNilai(data.h3), mid = fmtNilai(data.mid), pas = fmtNilai(data.pas), st = statusRapor(data), rapor = st.nilai;
        const color = st.final ? (rapor >= 75 ? 'nilai-hadir' : (rapor < 60 ? 'nilai-rendah' : '')) : '';
        const selRapor = rapor === null ? `<td class="text-muted">-</td>` : (st.final ? `<td class="${color}" style="font-weight:700;">${rapor}</td>` : `<td style="font-weight:700;">${raporSementaraHtml(rapor)}</td>`);
        bodyHtml += `<tr class="rekap-row"><td style="text-align:center;">${idx + 1}</td><td style="text-align:left;font-weight:600;">${escapeHtml(g.subject)}</td><td>${h1}</td><td>${h2}</td><td>${h3}</td><td>${mid}</td><td>${pas}</td>${selRapor}</tr>`;
        if (rapor !== null) { totalRapor += rapor; countRapor++; if (!st.final) adaSementara = true; }
      });
      tbody.innerHTML = bodyHtml;
      const rataSiswa = countRapor > 0 ? Math.round(totalRapor / countRapor) : 0;
      const colorRata = adaSementara ? '' : (rataSiswa >= 75 ? 'nilai-hadir' : (rataSiswa < 60 ? 'nilai-rendah' : ''));
      tfoot.innerHTML = adaSementara
        ? `<tr class="rata-rata-row"><td colspan="7" style="text-align:right;font-weight:700;">Rata-rata Seluruh Mapel</td><td style="font-weight:700;">${raporSementaraHtml(rataSiswa)}</td></tr>`
        : `<tr class="rata-rata-row"><td colspan="7" style="text-align:right;font-weight:700;">Rata-rata Seluruh Mapel</td><td style="font-weight:700;color:#059669;" class="${colorRata}">${rataSiswa}</td></tr>`;
      rekapNilaiDataCache = { siswa, grades, semester, mode: 'siswa' };
      info.textContent = `👤 ${siswa.name} | ${grades.length} mata pelajaran | Semester ${semester}`;
    }
    function populateRekapSiswaDropdown(kelas) {
      const select = document.getElementById('rekapNilaiSiswa');
      const siswaList = allSiswa.filter(s => s.kelas === kelas);
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      siswaList.forEach(s => { select.innerHTML += `<option value="${s.key}">${escapeHtml(s.name)}</option>`; });
    }
    // rekapNilaiDataCache hanya ditulis di jalur render yang SUKSES; jalur early-return (kelas tanpa
    // siswa/nilai, siswa belum dipilih, dst) tidak mengosongkannya. Akibatnya ekspor bisa mengunduh data
    // filter SEBELUMNYA dengan nama file/judul dari filter SAAT INI (mis. data kelas 3A berlabel kelas 4B).
    // Solusi: sebelum ekspor, kosongkan cache lalu render ulang dari allSiswa/allGrades + filter yang
    // sedang dipilih -- cache pasti sinkron dengan filter & data terkini; kalau tidak ada data, tetap kosong.
    function segarkanCacheRekapNilai() {
      rekapNilaiDataCache = {};
      renderRekapNilai();
      return rekapNilaiDataCache;
    }
    // Nama siswa untuk judul/nama file ekspor mode "per siswa" (kosong kalau mode per kelas).
    function rekapNilaiNamaSiswa(view) {
      return (view === 'siswa' && rekapNilaiDataCache && rekapNilaiDataCache.siswa && rekapNilaiDataCache.siswa.name) || '';
    }
    function namaFileAman(teks) {
      return String(teks || '').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_');
    }
    function exportRekapNilaiPDF() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value;
      segarkanCacheRekapNilai();
      const namaSiswa = rekapNilaiNamaSiswa(view);
      const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18); doc.text('REKAP NILAI', pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(14); doc.text(namaSiswa ? `${namaSiswa} - Kelas ${kelas} - Semester ${semester}` : `Kelas ${kelas} - Semester ${semester}`, pageWidth/2, 30, { align: 'center' });
      doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, 38, { align: 'right' });
      doc.line(20, 42, pageWidth - 20, 42);
      let rows = [], head = [];
      if (view === 'kelas') {
        const data = rekapNilaiDataCache; if (!data || !data.subjects) return toast('Tidak ada data untuk diekspor.', true);
        head = ['No', 'Nama Siswa', ...data.subjects, 'Rata-rata'];
        data.siswa.forEach((s, idx) => {
          const nilai = data.nilaiMap[s.key] || {}; const row = [idx+1, s.name]; let total = 0, count = 0;
          data.subjects.forEach(sub => { const n = nilai[sub]; if (n !== undefined && n !== null && n !== '') { const sem = data.sementaraMap && data.sementaraMap[s.key] && data.sementaraMap[s.key][sub]; row.push(sem ? `${Number(n)} (sementara)` : Number(n)); total += Number(n); count++; } else row.push('-'); });
          const rata = count > 0 ? Math.round(total / count) : '-'; row.push(rata); rows.push(row);
        });
        if (rows.length > 0) {
          const footer = ['', 'Rata-rata Kelas']; let totalRata = 0, countRata = 0;
          data.subjects.forEach(sub => { let sum = 0, cnt = 0; data.siswa.forEach(s => { const n = data.nilaiMap[s.key]?.[sub]; if (n !== undefined && n !== null && n !== '') { sum += Number(n); cnt++; } }); const rata = cnt > 0 ? Math.round(sum / cnt) : '-'; footer.push(rata); if (rata !== '-') { totalRata += rata; countRata++; } });
          const rataKelas = countRata > 0 ? Math.round(totalRata / countRata) : '-'; footer.push(rataKelas); rows.push(footer);
        }
      } else {
        const data = rekapNilaiDataCache; if (!data || !data.grades) return toast('Tidak ada data untuk diekspor.', true);
        head = ['No', 'Mata Pelajaran', 'NH1', 'NH2', 'NH3', 'MID', 'PAS', 'Rapor'];
        data.grades.forEach((g, idx) => { const d = g.data || {}; const st = statusRapor(d); rows.push([idx+1, g.subject, fmtNilai(d.h1), fmtNilai(d.h2), fmtNilai(d.h3), fmtNilai(d.mid), fmtNilai(d.pas), st.nilai === null ? '-' : (st.final ? st.nilai : `${st.nilai} (sementara)`)]); });
      }
      if (rows.length === 0) return toast('Tidak ada data untuk diekspor.', true);
      doc.autoTable({ startY: 48, head: [head], body: rows, theme: 'striped', styles: { fontSize: 9 }, headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontSize: 10, fontStyle: 'bold' }, didParseCell: function(data) { if (data.section === 'body' && data.column.index > 1 && typeof data.cell.raw === 'number') { if (data.cell.raw < 60) data.cell.styles.textColor = [220,38,38]; else if (data.cell.raw >= 75) data.cell.styles.textColor = [5,150,105]; } if (data.section === 'body' && data.row.index === rows.length - 1 && data.cell.raw === 'Rata-rata Kelas') { data.cell.styles.fillColor = [254,243,199]; data.cell.styles.fontStyle = 'bold'; } }, margin: { left: 15, right: 15 } });
      const adaSemPdf = view === 'kelas' ? Object.values(rekapNilaiDataCache.sementaraMap || {}).some(m => Object.keys(m).length) : rows.some(rw => String(rw[7]).includes('sementara'));
      if (adaSemPdf) { doc.setFontSize(9); doc.setTextColor(107,114,128); doc.text('Catatan: nilai berlabel (sementara) belum final (menunggu NH, MID, atau PAS); rata-rata yang memuatnya juga sementara.', 15, (doc.lastAutoTable ? doc.lastAutoTable.finalY : 48) + 8); doc.setTextColor(0,0,0); }
      doc.save(namaSiswa ? `Rekap_Nilai_${namaFileAman(namaSiswa)}_${kelas}_${semester}.pdf` : `Rekap_Nilai_${kelas}_${semester}.pdf`);
      toast('📥 Rekap nilai berhasil diunduh!'); addLog('export_rekap_nilai', namaSiswa ? `${namaSiswa} - ${kelas} - ${semester}` : `${kelas} - ${semester}`);
    }
    function exportRekapNilaiExcel() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value;
      segarkanCacheRekapNilai();
      const namaSiswa = rekapNilaiNamaSiswa(view);
      if (typeof XLSX === 'undefined') { toast('⚠️ Library Excel belum dimuat. Coba refresh.', true); return; }
      let data = [], headers = [];
      if (view === 'kelas') {
        const d = rekapNilaiDataCache; if (!d || !d.subjects) return toast('Tidak ada data untuk diekspor.', true);
        headers = ['No', 'Nama Siswa', ...d.subjects, 'Rata-rata']; data.push(headers);
        d.siswa.forEach((s, idx) => {
          const nilai = d.nilaiMap[s.key] || {}; const row = [idx+1, s.name]; let total = 0, count = 0;
          d.subjects.forEach(sub => { const n = nilai[sub]; if (n !== undefined && n !== null && n !== '') { const sem = d.sementaraMap && d.sementaraMap[s.key] && d.sementaraMap[s.key][sub]; row.push(sem ? `${Number(n)} (sementara)` : Number(n)); total += Number(n); count++; } else row.push('-'); });
          const rata = count > 0 ? Math.round(total / count) : '-'; row.push(rata); data.push(row);
        });
        if (data.length > 1) {
          const footer = ['', 'Rata-rata Kelas']; d.subjects.forEach(sub => { let sum = 0, cnt = 0; d.siswa.forEach(s => { const n = d.nilaiMap[s.key]?.[sub]; if (n !== undefined && n !== null && n !== '') { sum += Number(n); cnt++; } }); footer.push(cnt > 0 ? Math.round(sum / cnt) : '-'); }); let totalRata = 0, countRata = 0; d.subjects.forEach((sub, i) => { const val = footer[i+2]; if (val !== '-') { totalRata += val; countRata++; } }); footer.push(countRata > 0 ? Math.round(totalRata / countRata) : '-'); data.push(footer);
        }
      } else {
        const d = rekapNilaiDataCache; if (!d || !d.grades) return toast('Tidak ada data untuk diekspor.', true);
        headers = ['No', 'Mata Pelajaran', 'NH1', 'NH2', 'NH3', 'MID', 'PAS', 'Rapor']; data.push(headers);
        d.grades.forEach((g, idx) => { const dg = g.data || {}; const st = statusRapor(dg); data.push([idx+1, g.subject, fmtNilai(dg.h1), fmtNilai(dg.h2), fmtNilai(dg.h3), fmtNilai(dg.mid), fmtNilai(dg.pas), st.nilai === null ? '-' : (st.final ? st.nilai : `${st.nilai} (sementara)`)]); });
      }
      const wb = XLSX.utils.book_new();
      const colWidths = []; data[0].forEach((_, i) => { let maxLen = 10; data.forEach(row => { if (row[i] !== undefined && row[i] !== null) { const len = String(row[i]).length; if (len > maxLen) maxLen = len; } }); colWidths.push({ wch: Math.min(maxLen + 3, 30) }); });
      const adaSemXls = view === 'kelas' ? Object.values((rekapNilaiDataCache && rekapNilaiDataCache.sementaraMap) || {}).some(m => Object.keys(m).length) : data.some(rw => String(rw[7]).includes('sementara'));
      if (adaSemXls) data.push([], ['Catatan: nilai berlabel (sementara) belum final (menunggu NH, MID, atau PAS); rata-rata yang memuatnya juga sementara.']);
      // Mode per siswa: baris identitas di atas tabel (lebar kolom dihitung SEBELUM baris ini ditambah, supaya kolom "No" tidak melebar).
      if (namaSiswa) data.unshift(['Nama Siswa', namaSiswa], ['Kelas', kelas], ['Semester', semester], []);
      const ws = XLSX.utils.aoa_to_sheet(data); ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
      XLSX.writeFile(wb, namaSiswa ? `Rekap_Nilai_${namaFileAman(namaSiswa)}_${kelas}_${semester}.xlsx` : `Rekap_Nilai_${kelas}_${semester}.xlsx`);
      toast('📊 Rekap nilai berhasil diunduh!'); addLog('export_rekap_nilai_excel', namaSiswa ? `${namaSiswa} - ${kelas} - ${semester}` : `${kelas} - ${semester}`);
    }

// Pembungkus pemuat PDF/Excel malas (fungsi pembungkusnya didefinisikan di app.js, bagian "EXPORT PDF/EXCEL").
if (typeof simambaBungkusExportLazy === 'function') simambaBungkusExportLazy([['exportRekapNilaiPDF', 'pdf', 'PDF'], ['exportRekapNilaiExcel', 'xlsx', 'Excel']]);
