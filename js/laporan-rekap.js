// ============================================================
// laporan-rekap.js -- REKAP ABSENSI/JURNAL PDF & LAPORAN BULANAN PDF (dipecah dari app.js)
// ============================================================
// Isi: pembantu PDF rekap (kop, TTD, nomor halaman), Rekap Absensi Siswa, Rekap Absensi Guru,
// Rekap Jurnal, Unduh Semua; lalu halaman Laporan (pratinjau + generator laporan kehadiran,
// nilai, honor, jurnal, absensi guru, dan downloadReportPDF).
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat selain pembungkus
// pemuat PDF malas di bagian paling bawah berkas ini.
// TETAP di app.js: downloadFile(), unduhBackupJson(), autoBackup(), manualBackup() (dipakai alur login/backup).
// ============================================================

    // ============================================================
    // REKAP DOWNLOADS (PDF berkop) -- absensi siswa, absensi guru, jurnal
    // ============================================================
    const REKAP_BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    function rekapTglIndonesia(tgl) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
      return m ? `${parseInt(m[3], 10)} ${REKAP_BULAN_ID[parseInt(m[2], 10) - 1]} ${m[1]}` : (tgl || '-');
    }
    // Kop surat + judul. Mengembalikan posisi Y untuk konten berikutnya.
    // Tanda tangan Kepala di PDF lewat js/ttd-digital.js (QR / gambar / keduanya sesuai mode Profil Sekolah).
    // Mengembalikan {dipakai, tinggi}: dipakai=false bila ttd-digital.js tidak termuat (pemanggil memakai gambar lama).
    // opsi.hanyaPimpinan=true -> QR/gambar hanya bila yang mencetak Admin/Kepsek (selain itu ruang dibiarkan kosong).
    async function ttdKepalaPdf(doc, xTengah, yAtas, opsi) {
      if (!(window.TTD && typeof window.TTD.tandai === 'function')) return { dipakai: false, tinggi: 0 };
      try { return { dipakai: true, tinggi: (await window.TTD.tandai(doc, 'kepala', xTengah, yAtas, opsi)) || 0 }; }
      catch (e) { console.error('[SI MAMBA] TTD QR gagal, memakai gambar lama:', e); return { dipakai: false, tinggi: 0 }; }
    }
    function rekapGambarKop(doc, logoData, judul, barisInfo) {
      const pw = doc.internal.pageSize.getWidth();
      const offsetY = Math.max(0, v4KopMadrasahPdf(doc, pw, logoData, 15) - 40);   // kop tanpa tumpang tindih logo
      let y = 49 + offsetY;
      doc.setFont(undefined, 'bold'); doc.setFontSize(13);
      doc.text(judul, pw / 2, y, { align: 'center' });
      doc.setFont(undefined, 'normal'); doc.setFontSize(10);
      y += 7;
      (barisInfo || []).forEach(b => { doc.text(b, pw / 2, y, { align: 'center' }); y += 5; });
      return y + 3;
    }
    // Blok tanda tangan Kepala Madrasah (pindah halaman bila sisa ruang kurang).
    async function rekapGambarTtd(doc) {
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
      let y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 60) + 12;
      if (y + 55 > ph - 10) { doc.addPage(); y = 25; }
      const x = pw - 55;
      doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(0);
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, y);
      doc.text('Kepala ' + MADRASAH.nama, x, y, { align: 'center' });
      let yNama = y + 24;
      const ttd = await v4LoadTtdKepalaForPdf();
      if (ttd) {
        try {
          const w = 35, p = doc.getImageProperties(ttd), h = Math.min(18, w * (p.height / p.width));
          doc.addImage(ttd, 'PNG', x - w / 2, y + 3, w, h);
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Rekap:', e); }
      }
      doc.setFont(undefined, 'bold');
      doc.text(MADRASAH.kepala_sekolah || '', x, yNama, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.text('NIP. ' + (MADRASAH.nip_kepala_sekolah || '-'), x, yNama + 5, { align: 'center' });
    }
    // Nomor halaman di kaki setiap halaman.
    function rekapNomorHalaman(doc) {
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), n = doc.internal.getNumberOfPages();
      doc.setFontSize(8); doc.setTextColor(120);
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.text(`Halaman ${i} dari ${n}`, pw / 2, ph - 8, { align: 'center' }); }
      doc.setTextColor(0);
    }
    function rekapNamaGuruFilter(filterGuru) {
      return filterGuru ? ((allGuru || []).find(g => (g.key || g.name) === filterGuru)?.name || filterGuru) : 'Semua Guru';
    }
    function rekapInfoFilter(tglTeks, filterGuru, filterKelas) {
      return [tglTeks, `Guru: ${rekapNamaGuruFilter(filterGuru)}  |  Kelas: ${filterKelas || 'Semua Kelas'}`];
    }
    const REKAP_HEAD_STYLE = { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' };

    // Periode PDF: Harian (tanggal terpilih) atau Bulanan (bulan dari tanggal terpilih).
    // Pilihan diambil dari <select id="rekapPeriodePdf"> yang disisipkan di samping tombol unduh.
    function rekapPeriode() {
      const tgl = document.getElementById('rekapFilterTanggal').value || tglLokal();
      const sel = document.getElementById('rekapPeriodePdf');
      const bulanan = !!sel && sel.value === 'bulanan';
      if (!bulanan) return { bulanan: false, tgl, tag: tgl, label: `Tanggal: ${rekapTglIndonesia(tgl)}`, cocok: t => t === tgl };
      const pre = tgl.slice(0, 7), m = parseInt(tgl.slice(5, 7), 10);
      return { bulanan: true, tgl, tag: pre, label: `Bulan: ${REKAP_BULAN_ID[m - 1]} ${tgl.slice(0, 4)}`, cocok: t => (t || '').startsWith(pre) };
    }
    function rekapTglPendek(t) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (t || '-'); }

    async function downloadRekapAbsensiSiswa() { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const P = rekapPeriode();
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value;
      let data = allAttendance.filter(a => P.cocok(a.tanggal));
      // filterGuru berisi guruKey -- cocokkan lewat itu (record lama: fallback nama).
      if (filterGuru) data = data.filter(a => (a.guruKey || a.guru) === filterGuru);
      if (filterKelas) data = data.filter(a => a.kelas === filterKelas);
      const STAT = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpha' };
      let rows = [], foot, head, colStyles, orient = 'p';
      if (!P.bulanan) {
        const tot = { H: 0, S: 0, I: 0, A: 0 };
        data.forEach(a => { if (a.data) Object.entries(a.data).forEach(([siswaKey, status]) => {
          const s = allSiswa.find(x => x.key === siswaKey), st = String(status || '').toUpperCase();
          if (tot[st] !== undefined) tot[st]++;
          rows.push([a.kelas || '-', s ? s.name : siswaKey, a.guru || '-', STAT[st] || status || '-']);
        }); });
        rows.sort((a, b) => COLLATOR_ID.compare(a[0], b[0]) || COLLATOR_ID.compare(a[1], b[1]));
        rows.forEach((r, i) => r.unshift(String(i + 1)));
        head = ['No', 'Kelas', 'Nama Siswa', 'Guru', 'Status'];
        foot = ['', '', `Total ${rows.length} siswa`, '', `H:${tot.H}  S:${tot.S}  I:${tot.I}  A:${tot.A}`];
        colStyles = { 0: { halign: 'center', cellWidth: 12 }, 1: { cellWidth: 22 }, 4: { halign: 'center', cellWidth: 38 } };
      } else {
        // Bulanan: jumlah H/S/I/A per siswa + persentase kehadiran.
        const per = {}; const hariSet = new Set();
        data.forEach(a => { hariSet.add(a.tanggal); if (a.data) Object.entries(a.data).forEach(([siswaKey, status]) => {
          const st = String(status || '').toUpperCase(); const k = siswaKey + '|' + (a.kelas || '');
          const o = per[k] || (per[k] = { key: siswaKey, kelas: a.kelas || '-', H: 0, S: 0, I: 0, A: 0 });
          if (o[st] !== undefined) o[st]++;
        }); });
        const tot = { H: 0, S: 0, I: 0, A: 0 };
        Object.values(per).forEach(o => { const s = allSiswa.find(x => x.key === o.key); o.nama = s ? s.name : o.key; ['H','S','I','A'].forEach(c => tot[c] += o[c]); });
        const list = Object.values(per).sort((a, b) => COLLATOR_ID.compare(a.kelas, b.kelas) || COLLATOR_ID.compare(a.nama, b.nama));
        const pct = o => { const n = o.H + o.S + o.I + o.A; return n ? Math.round(o.H / n * 100) + '%' : '-'; };
        rows = list.map((o, i) => [String(i + 1), o.kelas, o.nama, String(o.H), String(o.S), String(o.I), String(o.A), pct(o)]);
        const n = tot.H + tot.S + tot.I + tot.A;
        head = ['No', 'Kelas', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpha', '% Hadir'];
        foot = ['', '', `${list.length} siswa / ${hariSet.size} hari absen`, String(tot.H), String(tot.S), String(tot.I), String(tot.A), n ? Math.round(tot.H / n * 100) + '%' : '-'];
        colStyles = { 0: { halign: 'center', cellWidth: 12 }, 1: { cellWidth: 22 }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center', cellWidth: 20 } };
      }
      if (!rows.length) return toast('Tidak ada data absensi siswa pada filter ini.', true);
      const { jsPDF } = window.jspdf; const doc = new jsPDF(orient, 'mm', 'a4');
      const logoData = await v4LoadLogoForPdf();
      const startY = rekapGambarKop(doc, logoData, P.bulanan ? 'REKAP ABSENSI SISWA BULANAN' : 'REKAP ABSENSI SISWA', rekapInfoFilter(P.label, filterGuru, filterKelas));
      doc.autoTable({
        head: [head], body: rows, foot: [foot],
        startY, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: REKAP_HEAD_STYLE,
        footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: colStyles, margin: { left: 15, right: 15, bottom: 15 },
        didParseCell: h => { if (h.section === 'body' && !P.bulanan && h.column.index === 4 && h.cell.raw === 'Alpha') h.cell.styles.textColor = [185, 28, 28]; }
      });
      await rekapGambarTtd(doc); rekapNomorHalaman(doc);
      doc.save(`rekap_absensi_siswa_${P.tag}.pdf`); toast('📥 Rekap absensi siswa (PDF) diunduh.');
      addLog('download_rekap', `absensi siswa PDF - ${P.tag}`);
    }
    // opts (opsional) dipakai dari Kelola Absen Guru: { P, filterGuru, data }. data = baris absen yang sudah
    // difilter (tidak disaring ulang). Tanpa opts = jalur lama (tombolnya sudah dihapus dari Ringkasan Sekolah).
    async function downloadRekapAbsensiGuru(opts) { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const o = (opts && typeof opts === 'object' && opts.P && Array.isArray(opts.data)) ? opts : null;
      const P = o ? o.P : rekapPeriode();
      const filterGuru = o ? (o.filterGuru || '') : document.getElementById('rekapFilterGuru').value;
      let data = o ? o.data.slice() : allTeacherAttendance.filter(a => P.cocok(a.tanggal));
      if (!o && filterGuru) data = data.filter(a => (a.guruKey || a.guru) === filterGuru);
      if (!data.length) return toast('Tidak ada data absensi guru pada filter ini.', true);
      let rows, head, foot, colStyles, orient;
      if (!P.bulanan) {
        data = data.slice().sort((a, b) => COLLATOR_ID.compare(a.guru || '', b.guru || '') || (waktuMs(a.waktu) - waktuMs(b.waktu)));
        rows = data.map((a, i) => [
          String(i + 1), a.guru || '-', Array.isArray(a.kelas) ? a.kelas.join(', ') : (a.kelas || '-'),
          waktuMs(a.waktu) ? new Date(waktuMs(a.waktu)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
          a.type || 'Reguler', a.jam_ke || '-', a.metode || 'manual', a.keterangan || '-'
        ]);
        const tot = {}; data.forEach(a => { const t = a.type || 'Reguler'; tot[t] = (tot[t] || 0) + 1; });
        head = ['No', 'Guru', 'Kelas', 'Waktu', 'Jenis', 'Jam Ke', 'Metode', 'Keterangan'];
        foot = ['', `Total ${rows.length} catatan`, '', '', Object.entries(tot).map(([k, v]) => `${k}: ${v}`).join('  '), '', '', ''];
        colStyles = { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center', cellWidth: 20 }, 5: { halign: 'center', cellWidth: 18 } };
        orient = 'l';
      } else {
        // Bulanan: hitung per guru -- hari hadir (hari yang punya absen Datang), Datang, Pulang, Izin, Sakit, Alpha.
        const per = {};
        data.forEach(a => {
          const k = a.guruKey || a.guru;
          const o = per[k] || (per[k] = { nama: a.guru || k, hari: new Set(), Datang: 0, Pulang: 0, Izin: 0, Sakit: 0, Alpha: 0 });
          const t = a.type; if (o[t] !== undefined && typeof o[t] === 'number') o[t]++;
          if (t === 'Datang') o.hari.add(a.tanggal);
        });
        const list = Object.values(per).sort((a, b) => COLLATOR_ID.compare(a.nama, b.nama));
        const sum = c => list.reduce((x, o) => x + o[c], 0);
        rows = list.map((o, i) => [String(i + 1), o.nama, String(o.hari.size), String(o.Datang), String(o.Pulang), String(o.Izin), String(o.Sakit), String(o.Alpha)]);
        head = ['No', 'Nama Guru', 'Hari Hadir', 'Datang', 'Pulang', 'Izin', 'Sakit', 'Alpha'];
        foot = ['', `${list.length} guru`, String(list.reduce((x, o) => x + o.hari.size, 0)), String(sum('Datang')), String(sum('Pulang')), String(sum('Izin')), String(sum('Sakit')), String(sum('Alpha'))];
        colStyles = { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' } };
        orient = 'p';
      }
      const { jsPDF } = window.jspdf; const doc = new jsPDF(orient, 'mm', 'a4');
      const logoData = await v4LoadLogoForPdf();
      const startY = rekapGambarKop(doc, logoData, P.judul || (P.bulanan ? 'REKAP ABSENSI GURU BULANAN' : 'REKAP ABSENSI GURU'), [P.label, `Guru: ${rekapNamaGuruFilter(filterGuru)}`]);
      doc.autoTable({
        head: [head], body: rows, foot: [foot],
        startY, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: REKAP_HEAD_STYLE,
        footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: colStyles, margin: { left: 15, right: 15, bottom: 15 }
      });
      await rekapGambarTtd(doc); rekapNomorHalaman(doc);
      doc.save(`rekap_absensi_guru_${P.tag}.pdf`); toast('📥 Rekap absensi guru (PDF) diunduh.');
      addLog('download_rekap', `absensi guru PDF - ${P.tag}`);
    }
    // opts (opsional) dipakai halaman Rekap Jurnal di menu Pembelajaran: { P, filterGuru, filterKelas }.
    // Tanpa opts (jalur lama; tombolnya sudah dihapus dari Ringkasan Sekolah) filter dibaca dari halaman Ringkasan.
    async function downloadRekapJurnal(opts) { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const o = (opts && typeof opts === 'object' && opts.P) ? opts : null;
      const P = o ? o.P : rekapPeriode();
      const filterGuru = o ? (o.filterGuru || '') : document.getElementById('rekapFilterGuru').value, filterKelas = o ? (o.filterKelas || '') : document.getElementById('rekapFilterKelas').value;
      // Jurnal yang ditolak tidak ikut direkap.
      let data = allJournals.filter(j => P.cocok(j.tanggal) && j.status !== 'ditolak');
      if (filterGuru) data = data.filter(j => (j.guruKey || j.guru) === filterGuru);
      if (filterKelas) data = data.filter(j => j.kelas === filterKelas);
      data = data.slice().sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || COLLATOR_ID.compare(a.guru || '', b.guru || '') || ((parseInt(a.jam_ke, 10) || 0) - (parseInt(b.jam_ke, 10) || 0)));
      if (!data.length) return toast('Tidak ada jurnal pada filter ini.', true);
      const jenis = j => j.type || (isJamEkstra(j.jam_ke) ? 'Ekstra' : 'Reguler');
      const rows = data.map((j, i) => [String(i + 1), rekapTglPendek(j.tanggal), j.guru || '-', j.kelas || '-', j.subject || '-', j.activity || '-', j.jam_ke || '-', jenis(j)]);
      // Ringkasan per guru (jumlah jurnal) sebagai baris total.
      const perGuru = {}; data.forEach(j => { const g = j.guru || '-'; perGuru[g] = (perGuru[g] || 0) + 1; });
      const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4');
      const logoData = await v4LoadLogoForPdf();
      const startY = rekapGambarKop(doc, logoData, P.bulanan ? 'REKAP JURNAL MENGAJAR BULANAN' : 'REKAP JURNAL MENGAJAR', rekapInfoFilter(P.label, filterGuru, filterKelas));
      doc.autoTable({
        head: [['No', 'Tanggal', 'Guru', 'Kelas', 'Mata Pelajaran', 'Kegiatan', 'Jam Ke', 'Jenis']], body: rows,
        foot: [['', `Total ${rows.length} jurnal`, '', '', '', '', '', '']],
        startY, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.8, valign: 'top' }, headStyles: REKAP_HEAD_STYLE,
        footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 22 }, 3: { cellWidth: 18 }, 5: { cellWidth: 75 }, 6: { halign: 'center', cellWidth: 15 }, 7: { halign: 'center', cellWidth: 20 } },
        margin: { left: 15, right: 15, bottom: 15 }
      });
      if (P.bulanan && Object.keys(perGuru).length > 1) {
        // Tabel ringkas jumlah jurnal per guru di akhir.
        doc.autoTable({
          head: [['Guru', 'Jumlah Jurnal']], body: Object.entries(perGuru).sort((a, b) => COLLATOR_ID.compare(a[0], b[0])).map(([g, n]) => [g, String(n)]),
          startY: doc.lastAutoTable.finalY + 8, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: REKAP_HEAD_STYLE,
          columnStyles: { 1: { halign: 'center', cellWidth: 30 } }, tableWidth: 110, margin: { left: 15, right: 15, bottom: 15 }
        });
      }
      await rekapGambarTtd(doc); rekapNomorHalaman(doc);
      doc.save(`rekap_jurnal_${P.tag}.pdf`); toast('📥 Rekap jurnal (PDF) diunduh.');
      addLog('download_rekap', `jurnal PDF - ${P.tag}`);
    }
    function downloadRekapSemua() { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value;
      let siswa = allSiswa, guru = allGuru, jurnal = allJournals.filter(j => j.status !== 'ditolak'), absenSiswa = allAttendance, absenGuru = allTeacherAttendance;
      // Siswa (wali kelas) cuma simpan nama, tidak ada guruKey -- resolve filterGuru (key) balik
      // ke nama khusus untuk baris ini. Jurnal & absen guru sudah punya guruKey, cocokkan lewat itu.
      const filterGuruNama = filterGuru ? ((allGuru || []).find(g => (g.key || g.name) === filterGuru)?.name || filterGuru) : '';
      if (filterGuru) { siswa = siswa.filter(s => s.guru === filterGuruNama); jurnal = jurnal.filter(j => (j.guruKey || j.guru) === filterGuru); absenGuru = absenGuru.filter(a => (a.guruKey || a.guru) === filterGuru); }
      if (filterKelas) { siswa = siswa.filter(s => s.kelas === filterKelas); jurnal = jurnal.filter(j => j.kelas === filterKelas); absenSiswa = absenSiswa.filter(a => a.kelas === filterKelas); }
      let csv = '=== DATA GURU ===\nNama,Kelas,SemuaKelas,Role\n';
      guru.forEach(g => { const kelasStr = Array.isArray(g.kelas) ? g.kelas.join('; ') : g.kelas || '-'; csv += `${g.name},${kelasStr},${g.semuaKelas ? 'Ya' : 'Tidak'},${g.role||'guru'}\n`; });
      csv += '\n=== DATA SISWA ===\nNama,Kelas,Guru\n';
      siswa.forEach(s => { csv += `${s.name},${s.kelas},${s.guru || '-'}\n`; });
      csv += '\n=== JURNAL ===\nTanggal,Guru,Kelas,Subject,Kegiatan,Jam,Type\n';
      jurnal.forEach(j => { csv += `${j.tanggal},${j.guru},${j.kelas},${j.subject},"${j.activity}",${j.jam_ke||'-'},${j.type||'Reguler'}\n`; });
      csv += '\n=== ABSENSI SISWA ===\nTanggal,Kelas,Guru,Siswa,Status\n';
      absenSiswa.forEach(a => { if (a.data) { Object.entries(a.data).forEach(([siswaKey, status]) => { const siswa = allSiswa.find(s => s.key === siswaKey); const namaSiswa = siswa ? siswa.name : siswaKey; csv += `${a.tanggal},${a.kelas},${a.guru},${namaSiswa},${status}\n`; }); } });
      csv += '\n=== ABSENSI GURU ===\nTanggal,Guru,Kelas,Waktu,Type,Ke,Metode,Jam\n';
      absenGuru.forEach(a => { const kelasStr = Array.isArray(a.kelas) ? a.kelas.join('; ') : a.kelas || '-'; const waktu = a.waktu ? new Date(a.waktu).toLocaleString() : '-'; csv += `${a.tanggal},${a.guru},${kelasStr},${waktu},${a.type||'Reguler'},${a.ke||1},${a.metode||'manual'},${a.jam_ke||'-'}\n`; });
      csv += '\n=== ABSENSI RELIGI ===\nTanggal,Guru,Dhuha,Dzuhur\n';
      // FIX: seksi ini sebelumnya SELALU memuat semua guru, tidak ikut kena filterGuru --
      // padahal semua seksi lain di atas (jurnal, absenGuru, dst) sudah taat pada filter yang
      // dipilih Admin/Kepsek di halaman Rekap. Sekarang dicocokkan sama seperti jurnal/absenGuru:
      // guruKey dulu (record baru), fallback ke nama (record lama yang belum punya guruKey).
      let religi = allReligiAttendance;
      if (filterGuru) religi = religi.filter(r => (r.guruKey || r.guru) === filterGuru);
      religi.forEach(r => { const dluha = r.sholat_dluha ? r.sholat_dluha.status : '-'; const dzuhur = r.sholat_dzuhur ? r.sholat_dzuhur.status : '-'; csv += `${r.tanggal},${r.guru},${dluha},${dzuhur}\n`; });
      const today = tglLokal();
      downloadFile(csv, `rekap_semua_data_${today}.csv`, 'text/csv'); toast('📥 Rekap semua data diunduh.');
    }

    // ============================================================
    // NEW FEATURE: LAPORAN FORMAL
    // ============================================================
    function loadReportPreview() {
      const type = document.getElementById('reportType').value;
      const kelas = document.getElementById('reportClass').value;
      const month = document.getElementById('reportMonth').value;
      const year = document.getElementById('reportYear').value;
      const container = document.getElementById('reportPreviewContainer');
      
      if (!container) return;

      let html = generateKopSuratHTML() + '<div style="padding-top:10px;">';
      switch(type) {
        case 'kehadiran':
          html += generateKehadiranReport(kelas, month, year);
          break;
        case 'nilai':
          html += generateNilaiReport(kelas, month, year);
          break;
        case 'honor':
          html += generateHonorReport(month, year);
          break;
        case 'jurnal':
          html += generateJurnalReport(month, year);
          break;
        case 'absensi-guru':
          html += generateAbsensiGuruReport(month, year);
          break;
        default:
          html = '<p class="text-muted" style="text-align:center;padding:20px 0;">Pilih jenis laporan.</p>';
      }
      html += '</div>';
      container.innerHTML = html;
    }

    function generateKehadiranReport(kelas, month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      const monthStr = year + '-' + String(month).padStart(2, '0');
      
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN KEHADIRAN SISWA</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">Kelas ${escapeHtml(kelas)} - ${monthName} ${year}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>Hadir</th>
              <th>Sakit</th>
              <th>Izin</th>
              <th>Alfa</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>`;

      let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlfa = 0;
      siswa.forEach((s, idx) => {
        const attendanceData = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.kelas === kelas && sesuaiTahunAjaranTermasukDataLama(a));
        let hadir = 0, sakit = 0, izin = 0, alfa = 0;
        attendanceData.forEach(a => {
          if (a.data && a.data[s.key]) {
            const status = a.data[s.key];
            if (status === 'H') hadir++;
            else if (status === 'S') sakit++;
            else if (status === 'I') izin++;
            else if (status === 'A') alfa++;
          }
        });
        const total = hadir + sakit + izin + alfa;
        totalHadir += hadir; totalSakit += sakit; totalIzin += izin; totalAlfa += alfa;
        html += `<tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${hadir}</td>
          <td>${sakit}</td>
          <td>${izin}</td>
          <td>${alfa}</td>
          <td>${total}</td>
        </tr>`;
      });

      html += `
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2">TOTAL</td>
              <td>${totalHadir}</td>
              <td>${totalSakit}</td>
              <td>${totalIzin}</td>
              <td>${totalAlfa}</td>
              <td>${totalHadir + totalSakit + totalIzin + totalAlfa}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      return html;
    }

    function generateNilaiReport(kelas, month, year) {
      const semester = parseInt(month) <= 6 ? 'Genap' : 'Ganjil';
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      const grades = allGrades.filter(g => g.kelas === kelas && g.semester === semester);
      const subjects = [...new Set(grades.map(g => g.subject))].sort();

      if (subjects.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Belum ada data nilai untuk kelas ${escapeHtml(kelas)} semester ${escapeHtml(semester)}.</p>`;
      }

      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN NILAI RAPOR</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">Kelas ${escapeHtml(kelas)} - Semester ${escapeHtml(semester)}<br>Tahun Ajaran ${currentTahunAjaran}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>`;
      
      subjects.forEach(sub => {
        html += `<th>${sub}</th>`;
      });
      html += `<th>Rata-rata</th></tr></thead><tbody>`;

      let totalNilaiMap = {};
      siswa.forEach((s, idx) => {
        const gradeData = grades.filter(g => g.siswaKey === s.key);
        const nilaiMap = {};
        gradeData.forEach(g => {
          if (g.data) nilaiMap[g.subject] = calculateRapor(g.data);
        });
        let totalSiswa = 0, countSiswa = 0;
        html += `<tr><td>${idx + 1}</td><td>${escapeHtml(s.name)}</td>`;
        subjects.forEach(sub => {
          const n = nilaiMap[sub];
          if (n !== undefined) {
            html += `<td>${n}</td>`;
            totalSiswa += n;
            countSiswa++;
            if (!totalNilaiMap[sub]) totalNilaiMap[sub] = { total: 0, count: 0 };
            totalNilaiMap[sub].total += n;
            totalNilaiMap[sub].count++;
          } else {
            html += `<td class="text-muted">-</td>`;
          }
        });
        const rata = countSiswa > 0 ? Math.round(totalSiswa / countSiswa) : '-';
        html += `<td style="font-weight:700;${rata !== '-' && rata >= 75 ? 'color:#059669;' : rata !== '-' && rata < 60 ? 'color:#dc2626;' : ''}">${rata}</td></tr>`;
      });

      html += `</tbody><tfoot><tr style="font-weight:700;background:#fef3c7;"><td colspan="2">Rata-rata Kelas</td>`;
      let totalRataKelas = 0, countRataKelas = 0;
      subjects.forEach(sub => {
        const data = totalNilaiMap[sub];
        if (data && data.count > 0) {
          const rata = Math.round(data.total / data.count);
          html += `<td>${rata}</td>`;
          totalRataKelas += rata;
          countRataKelas++;
        } else {
          html += `<td>-</td>`;
        }
      });
      const rataKelas = countRataKelas > 0 ? Math.round(totalRataKelas / countRataKelas) : '-';
      html += `<td style="color:#059669;">${rataKelas}</td></tr></tfoot></table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      return html;
    }

    function generateHonorReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      
      const filteredJournals = allJournals.filter(j => {
        if (!j.tanggal) return false;
        const parts = j.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(j) && j.status !== 'ditolak';
      });
      const hs = honorSholatDapat(year, monthStr, () => { try { loadReportPreview(); } catch (e) { console.warn(e); } });
      if (!hs.siap) return honorSholatStatusHtml(hs, 'loadReportPreview()');
      const filteredReligi = Object.keys(hs.hasil.perGuru);   // hanya untuk cek "ada data"
      const filteredEvents = allEventAttendance.filter(e => {
        if (!e.tanggal) return false;
        const parts = e.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(e);
      });
      const filteredUjian = allUjianAttendance.filter(u => {
        if (!u.tanggal) return false;
        const parts = u.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(u);
      });
      const filteredEkskulPic = allEkskulPicHonor.filter(x => {
        if (!x.tanggal) return false;
        const parts = x.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(x);
      });
      const guruAktifTunjangan = honorGuruBertunjangan();
      // FIX: dulu fungsi ini return kosong kalau kelima sumber data guru kosong, PADAHAL
      // renderHonor() tetap menampilkan (dan menjumlahkan) bonus tetap Kepala Madrasah & Ketua
      // Yayasan setiap bulan, terlepas ada tidaknya data guru lain -- lihat guruTerajinBulanIni
      // di bawah, yang juga harus ikut jadi syarat "ada data" seperti di renderHonor().
      const guruTerajinKeyReport = year + '-' + monthStr;
      const guruTerajinBulanIniReport = allGuruTerajin[guruTerajinKeyReport];
      if (filteredJournals.length === 0 && filteredReligi.length === 0 && filteredEvents.length === 0 && filteredUjian.length === 0 && guruAktifTunjangan.length === 0 && !guruTerajinBulanIniReport) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data untuk bulan ${monthName} ${year}.</p>`;
      }

      // Pengelompokan & rumus honor memakai util yang SAMA dengan layar Honor, Slip, dan PDF (js/honor-guru.js: honorKelompokkan, honorKunciGuru,
      // honorRincianGuru) -- total laporan cetak selalu sama dengan yang tampil di layar Honor untuk bulan yang sama.
      const grup = honorKelompokkan({ journals: filteredJournals, events: filteredEvents, ujian: filteredUjian, ekskulPic: filteredEkskulPic, religiPerGuru: hs.hasil.perGuru });
      const dlKepalaReport = grup.dlKepala;   // Dinas Luar Kepala -> digabung ke baris Kepala Madrasah (sama seperti renderHonor)

      const rates = v4GetHonorRates(), HONOR_KEPSEK_REPORT = rates.kepsek, HONOR_KETUA_YAYASAN_REPORT = rates.yayasan;
      const allTeacherKeys = honorKunciGuru(grup, guruAktifTunjangan);
      // FIX: bonus tetap Kepala Madrasah & Ketua Yayasan, plus Guru Terajin bulan ini kalau ada --
      // sebelumnya TIDAK ADA di laporan cetak sama sekali, padahal renderHonor() selalu
      // menyertakan & menjumlahkannya ke totalHonor. Baris ini yang membuat TOTAL HONOR di
      // laporan cetak selalu lebih kecil ±Rp 650.000 (+ bonus guru terajin bila ada) dibanding
      // yang tampil di layar Honor untuk bulan yang sama.
      let bonusListReport = [{ label: 'Kepala Madrasah', amount: HONOR_KEPSEK_REPORT + dlKepalaReport.honor, dlJumlah: dlKepalaReport.jumlah, dlHonor: dlKepalaReport.honor }, { label: 'Ketua Yayasan', amount: HONOR_KETUA_YAYASAN_REPORT }];
      if (guruTerajinBulanIniReport) bonusListReport.push({ label: `🏆 Guru Terajin - ${guruTerajinBulanIniReport.guru}`, amount: guruTerajinBulanIniReport.honor });
      
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN HONOR GURU</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Guru</th>
              <th>Reguler</th>
              <th>Non-Reg</th>
              <th>Ekstra</th>
              <th>Dhuha</th>
              <th>Dzuhur</th>
              <th>Lembur/Rapat</th>
              <th>Ujian</th>
              <th>Tunjangan</th>
              <th>Transport</th>
              <th>Total Honor</th>
            </tr>
          </thead>
          <tbody>`;

      let no = 1, totalHonor = 0;
      bonusListReport.forEach(bonus => {
        totalHonor += bonus.amount;
        html += `<tr style="background:#fef3c7;font-weight:600;">
          <td>${no++}</td>
          <td>${escapeHtml(bonus.label)}</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>${bonus.dlJumlah > 0 ? `${bonus.dlJumlah}x (Rp ${bonus.dlHonor.toLocaleString()})` : '-'}</td><td>-</td>
          <td>-</td><td>-</td>
          <td style="font-weight:700;color:#059669;">Rp ${bonus.amount.toLocaleString()}</td>
        </tr>`;
      });
      for (const guruKey of allTeacherKeys) {
        const { j, r, ev, uj, ekpic, guru, tunjangan, transport, ekstraHonor, honor } = honorRincianGuru(guruKey, grup, rates);
        totalHonor += honor;
        html += `<tr>
          <td>${no++}</td>
          <td>${escapeHtml(guru)}</td>
          <td>${j.reguler}</td>
          <td>${j.nonReguler}</td>
          <td>${j.ekstra}x (Rp ${ekstraHonor.toLocaleString()})</td>
          <td>${r.dluha}</td>
          <td>${r.dzuhur}</td>
          <td>${ev.jumlah}x (Rp ${ev.honor.toLocaleString()})</td>
          <td>${uj.jumlah}x (Rp ${uj.honor.toLocaleString()})</td>
          <td>Rp ${tunjangan.toLocaleString()}</td>
          <td>Rp ${transport.toLocaleString()}</td>
          <td style="font-weight:700;color:#059669;">Rp ${honor.toLocaleString()}</td>
        </tr>`;
      }

      html += `
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="11" style="text-align:right;">TOTAL HONOR</td>
              <td style="color:#059669;font-size:14px;">Rp ${totalHonor.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:8px;font-size:10px;">
          * Reguler: Rp ${rates.reguler}/jam | Non-Reguler: Rp ${rates.nonReguler}/jam | Ekstra: sesuai rate per kegiatan<br>
          * Dhuha: Rp ${rates.dluha}/hadir | Dzuhur: Rp ${rates.dzuhur}/hadir | Lembur/Rapat & Ujian: sesuai honor per sesi | Tunjangan & Transport: sesuai pengaturan per guru
        </div>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      html += honorSholatDitolakHtml(hs.hasil.ditolak, true);
      return html;
    }

    function generateJurnalReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      const filteredJournals = allJournals.filter(j => {
        if (!j.tanggal) return false;
        const parts = j.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(j) && j.status !== 'ditolak';
      });
      if (filteredJournals.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data jurnal untuk bulan ${monthName} ${year}.</p>`;
      }
      const grouped = {};
      // FIX: dulu dikelompokkan pakai NAMA (grouped[j.guru]) -- kalau ada 2 guru bernama sama,
      // jumlah jam Reguler/Non-Reguler/Ekstra keduanya SILANG TERGABUNG jadi satu baris di
      // laporan cetak ini. generateHonorReport() di atas sudah dibenahi pakai guruKey; sekarang
      // laporan ini disamakan.
      filteredJournals.forEach(j => {
        const gk = j.guruKey || j.guru;
        if (!grouped[gk]) grouped[gk] = { nama: j.guru, reguler: 0, nonReguler: 0, ekstra: 0 };
        if (isJamEkstra(j.jam_ke)) grouped[gk].ekstra += 1;
        else if (j.type === 'Non-Reguler') grouped[gk].nonReguler += 1;
        else grouped[gk].reguler += 1;
      });
      const guruList = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(grouped[a].nama, grouped[b].nama));
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">REKAP JURNAL MENGAJAR</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr><th>No</th><th>Nama Guru</th><th>Reguler</th><th>Non-Reguler</th><th>Ekstra</th><th>Total Jam</th></tr>
          </thead>
          <tbody>`;
      let no = 1, tReguler = 0, tNonReguler = 0, tEkstra = 0, tTotal = 0;
      guruList.forEach(guru => {
        const g = grouped[guru]; const total = g.reguler + g.nonReguler + g.ekstra;
        tReguler += g.reguler; tNonReguler += g.nonReguler; tEkstra += g.ekstra; tTotal += total;
        html += `<tr><td>${no++}</td><td>${escapeHtml(g.nama)}</td><td>${g.reguler}</td><td>${g.nonReguler}</td><td>${g.ekstra}</td><td style="font-weight:700;">${total}</td></tr>`;
      });
      html += `</tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2" style="text-align:right;">TOTAL</td><td>${tReguler}</td><td>${tNonReguler}</td><td>${tEkstra}</td><td>${tTotal}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">Dicetak: ${new Date().toLocaleString()}</div>`;
      return html;
    }

    function generateAbsensiGuruReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      const filtered = allTeacherAttendance.filter(a => {
        if (!a.tanggal) return false;
        const parts = a.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && sesuaiTahunAjaranTermasukDataLama(a);
      });
      if (filtered.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data absensi guru untuk bulan ${monthName} ${year}.</p>`;
      }
      const grouped = {};
      // FIX: sama seperti generateJurnalReport di atas -- dulu dikelompokkan pakai NAMA, kalau
      // ada 2 guru bernama sama statistik Datang/Telat/Izin/Sakit/Alpha keduanya tergabung jadi
      // satu baris. Sekarang dikelompokkan pakai guruKey.
      filtered.forEach(a => {
        const gk = a.guruKey || a.guru;
        if (!grouped[gk]) grouped[gk] = { nama: a.guru, datang: 0, telat: 0, izin: 0, sakit: 0, alpha: 0 };
        if (a.type === 'Datang') { grouped[gk].datang += 1; if (a.keterangan && a.keterangan.startsWith('Telat')) grouped[gk].telat += 1; }
        else if (a.type === 'Izin') grouped[gk].izin += 1;
        else if (a.type === 'Sakit') grouped[gk].sakit += 1;
        else if (a.type === 'Alpha') grouped[gk].alpha += 1;
      });
      const guruList = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(grouped[a].nama, grouped[b].nama));
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">REKAP ABSENSI GURU</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr><th>No</th><th>Nama Guru</th><th>Datang</th><th>Telat</th><th>Izin</th><th>Sakit</th><th>Alpha</th></tr>
          </thead>
          <tbody>`;
      let no = 1, tDatang = 0, tTelat = 0, tIzin = 0, tSakit = 0, tAlpha = 0;
      guruList.forEach(guru => {
        const g = grouped[guru];
        tDatang += g.datang; tTelat += g.telat; tIzin += g.izin; tSakit += g.sakit; tAlpha += g.alpha;
        html += `<tr><td>${no++}</td><td>${escapeHtml(g.nama)}</td><td>${g.datang}</td><td${g.telat>0?' style="color:#dc2626;font-weight:600;"':''}>${g.telat}</td><td>${g.izin}</td><td>${g.sakit}</td><td${g.alpha>0?' style="color:#dc2626;font-weight:700;"':''}>${g.alpha}</td></tr>`;
      });
      html += `</tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2" style="text-align:right;">TOTAL</td><td>${tDatang}</td><td>${tTelat}</td><td>${tIzin}</td><td>${tSakit}</td><td>${tAlpha}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:8px;font-size:10px;">* "Telat" adalah bagian dari "Datang" yang melewati jam masuk sesuai jadwal. "Alpha" ditandai otomatis sistem jika guru sama sekali tidak melapor kehadiran pada hari itu.</div>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">Dicetak: ${new Date().toLocaleString()}</div>`;
      return html;
    }

    async function downloadReportPDF() {
      const type = document.getElementById('reportType').value;
      const kelas = document.getElementById('reportClass').value;
      const month = document.getElementById('reportMonth').value;
      const year = document.getElementById('reportYear').value;
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoData = await v4LoadLogoForPdf();
      const ttdKepalaDataLap = await v4LoadTtdKepalaForPdf();
      let title = '';
      let filename = '';
      switch(type) {
        case 'kehadiran':
          title = `LAPORAN KEHADIRAN SISWA\nKelas ${kelas} - ${monthName} ${year}`;
          filename = `Kehadiran_${kelas}_${monthName}_${year}`;
          break;
        case 'nilai':
          const semester = parseInt(month) <= 6 ? 'Genap' : 'Ganjil';
          title = `LAPORAN NILAI RAPOR\nKelas ${kelas} - Semester ${semester}\nTahun Ajaran ${currentTahunAjaran}`;
          filename = `Nilai_${kelas}_${semester}_${year}`;
          break;
        case 'honor':
          title = `LAPORAN HONOR GURU\n${monthName} ${year}`;
          filename = `Honor_Guru_${monthName}_${year}`;
          break;
        case 'jurnal':
          title = `REKAP JURNAL MENGAJAR\n${monthName} ${year}`;
          filename = `Jurnal_Mengajar_${monthName}_${year}`;
          break;
        case 'absensi-guru':
          title = `REKAP ABSENSI GURU\n${monthName} ${year}`;
          filename = `Absensi_Guru_${monthName}_${year}`;
          break;
        default:
          return toast('Pilih jenis laporan!', true);
      }

      const previewEl = document.getElementById('reportPreviewContainer');
      const text = previewEl ? previewEl.textContent || '' : '';

      // Kop surat di PDF
      const offsetY2 = Math.max(0, v4KopMadrasahPdf(doc, pageWidth, logoData, 20) - 40);   // kop tanpa tumpang tindih logo (emoji diganti teks: font PDF tak punya glyph emoji)

      doc.setFontSize(16);
      const lines = title.split('\n');
      let y = 48 + offsetY2;
      lines.forEach(line => {
        doc.text(line, pageWidth/2, y, { align: 'center' });
        y += 8;
      });
      
      doc.setFontSize(10);
      doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, y + 8, { align: 'right' });
      
      // PENTING: parsing SEBELUMNYA membaca previewEl.textContent lalu men-split per '\t' --
      // padahal markup tabel laporan (lihat generateKehadiranReport dkk.) menaruh tiap <td>
      // pada baris template-literal TERPISAH, bukan dipisah tab. Akibatnya baris "No" dan
      // "Nama" tidak pernah ketemu jadi SATU baris teks yang sama, deteksi header selalu
      // gagal, headers & tableData selalu kosong -- PDF jatuh ke mode cadangan yang menumpuk
      // SETIAP isi sel sebagai baris teks lepas satu-satu tanpa label kolom (hasil PDF jadi
      // daftar angka/nama tak beraturan, bukan tabel). Sekarang tabel dibaca LANGSUNG dari
      // elemen DOM <table> yang sudah dirender (thead/tbody/tfoot), termasuk menghormati
      // atribut colspan supaya kolom tetap sejajar dengan header.
      function domRowToArray(tr) {
        const row = [];
        Array.from(tr.children).forEach(cell => {
          const span = parseInt(cell.getAttribute('colspan'), 10) || 1;
          row.push(cell.textContent.trim());
          for (let i = 1; i < span; i++) row.push('');
        });
        return row;
      }
      let headers = [];
      const bodyRows = [];
      let footRow = null;
      const tableEl = previewEl ? previewEl.querySelector('table') : null;
      if (tableEl) {
        const headTr = tableEl.querySelector('thead tr');
        if (headTr) headers = domRowToArray(headTr);
        tableEl.querySelectorAll('tbody tr').forEach(tr => bodyRows.push(domRowToArray(tr)));
        const footTr = tableEl.querySelector('tfoot tr');
        if (footTr) footRow = domRowToArray(footTr);
      }

      if (bodyRows.length > 0 && headers.length > 0) {
        const startY = y + 16;
        doc.autoTable({
          head: [headers],
          body: bodyRows,
          foot: footRow ? [footRow] : undefined,
          startY: startY,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
          footStyles: { fillColor: [209, 213, 219], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: 15, right: 15 }
        });
      } else {
        doc.setFontSize(10);
        const textLines = text.split('\n').filter(l => l.trim() !== '');
        let textY = y + 16;
        textLines.forEach(line => {
          if (textY > 270) { doc.addPage(); textY = 20; }
          doc.text(line.substring(0, 80), 20, textY);
          textY += 6;
        });
      }

      // Tanda tangan
      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 40;
      if (finalY < 260) {
        if (finalY + 52 > 290) { doc.addPage(); finalY = 10; }   // QR butuh ruang lebih: blok Kepala pindah halaman bila tak muat
        doc.setFontSize(12);
        doc.text('Kepala ' + MADRASAH.nama, pageWidth/2, finalY + 10, { align: 'center' });
        let yNamaKepalaLap = finalY + 20;
        const ttdLap = await ttdKepalaPdf(doc, pageWidth/2, finalY + 12, { lebar: 35, tinggiMaks: 20, meta: { jenis: 'Laporan ' + type, ket: [kelas, monthName + ' ' + year].filter(Boolean).join(' | ') } });
        if (ttdLap.dipakai) {
          yNamaKepalaLap = finalY + 12 + Math.max(ttdLap.tinggi, 18) + 4;
        } else if (ttdKepalaDataLap) {
          try {
            const ttdW = 35;
            const propsTtd = doc.getImageProperties(ttdKepalaDataLap);
            const ttdH = Math.min(18, ttdW * (propsTtd.height / propsTtd.width));
            doc.addImage(ttdKepalaDataLap, 'PNG', pageWidth/2 - ttdW/2, finalY + 13, ttdW, ttdH);
          } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Laporan:', e); }
          yNamaKepalaLap = finalY + 22;
        }
        doc.text(MADRASAH.kepala_sekolah, pageWidth/2, yNamaKepalaLap, { align: 'center' });
        doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, pageWidth/2, yNamaKepalaLap + 8, { align: 'center' });
      }

      doc.save(`${filename}.pdf`);
      toast('📥 Laporan berhasil diunduh!');
      addLog('download_report', `${type} - ${kelas} - ${monthName} ${year}`);
    }

// Pembungkus pemuat PDF malas (fungsi pembungkusnya didefinisikan di app.js, bagian "EXPORT PDF/EXCEL").
if (typeof simambaBungkusExportLazy === 'function') simambaBungkusExportLazy([
  ['downloadReportPDF', 'pdf', 'PDF'],
  ['downloadRekapAbsensiSiswa', 'pdf', 'PDF'], ['downloadRekapAbsensiGuru', 'pdf', 'PDF'], ['downloadRekapJurnal', 'pdf', 'PDF']
]);
