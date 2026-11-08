// ============================================================
// kelola-absen-guru.js -- KELOLA ABSEN GURU (kag*) & KOREKSI HONOR SHOLAT (krg*) (dipecah dari app.js)
// ============================================================
// Isi: halaman Kelola Absen Guru (Admin: koreksi/tambah/hapus absen guru, rekap PDF) dan kartu
// koreksi honor sholat (Hadir/Tidak Hadir per guru per tanggal). Dimuat SESUDAH js/app.js.
// Tidak ada kode yang jalan saat dimuat -- hanya deklarasi.
// TETAP di app.js: downloadHonorPDF() (dibungkus pemuat PDF malas di app.js).
// ============================================================

    // ============================================================
    // KELOLA ABSEN GURU (Admin: lihat + edit + tambah + hapus | Kepala Madrasah: lihat saja)
    // ============================================================
    // Key catatan absen guru = `${tanggal}_${guru.key}_${jenis}` (sama dengan yang dipakai verifyAndAbsen) --
    // menjamin 1 catatan per jenis per guru per hari. Karena itu ubah tanggal/jenis/guru = tulis ke key
    // baru + hapus key lama dalam SATU update atomik, dan ditolak kalau key baru sudah terisi.
    const KAG_TIPE = ['Datang', 'Pulang', 'Izin', 'Sakit', 'Alpha'];
    const KAG_HARI_PENUH = ['Izin', 'Sakit', 'Alpha'];
    let kagRows = [], kagRange = null, kagEditKey = null, kagLoading = false, kagSaving = false, kagGuruTambahan = null;
    function kagEl(id) { return document.getElementById(id); }
    // Catatan: role kosong (mis. guru yang juga kepala madrasah, data dibuat tanpa field role) ikut dianggap guru.
    // Node `guru` di Rules hanya mengizinkan role guru/wali_kelas/kosong, jadi role kosong tetap pegawai pengajar.
    function kagGuruList() { return (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas' || !g.role).sort((a, b) => COLLATOR_ID.compare((a.name || ''), b.name || '')); }
    // Daftar guru untuk form edit: guru aktif + (bila perlu) satu guru tambahan milik catatan yang sedang diedit
    // (peran bukan guru/wali kelas, atau guru yang sudah dihapus dari daftar). Dipakai kagBuka & kagSimpan.
    function kagGuruListForm() { return kagGuruTambahan ? kagGuruList().concat([kagGuruTambahan]) : kagGuruList(); }
    function kagCocokGuru(a, g) { return a.guruKey ? a.guruKey === g.key : a.guru === g.name; }
    // Pesan galat yang bisa ditindaklanjuti. Firebase melaporkan data yang melanggar aturan validasi Rules (mis. `waktu` bukan angka,
    // tanggal bukan YYYY-MM-DD, jenis di luar daftar) sebagai PERMISSION_DENIED yang sama dengan penolakan izin -- jadi sebutkan keduanya.
    function kagPesanGalat(e, aksi) {
      if (e && e.tampil) return e.tampil;
      const msg = String((e && e.message) || e || '');
      if (/permission[_ ]denied/i.test(msg)) {
        return aksi + ' ditolak server (PERMISSION_DENIED). Penyebab umum: format data tidak sesuai aturan Firebase Rules (jam/tanggal/jenis) atau sesi login belum aktif. Muat ulang halaman lalu coba lagi; bila tetap, kirim tangkapan layar Console (F12) ke pengembang.';
      }
      if (/network|timeout|offline|disconnect/i.test(msg)) return aksi + ' gagal: koneksi bermasalah. Periksa sinyal lalu coba lagi.';
      return aksi + ' gagal: ' + msg;
    }
    function setupKelolaAbsenGuruPage() {
      if (!isAdmin() && !isKepsek()) return;
      if (isAdmin()) { try { krgSetupCard(); } catch (e) { console.error('[SI MAMBA] krgSetupCard gagal:', e); } }
      const dari = kagEl('kagDari'), sampai = kagEl('kagSampai');
      if (!dari.value || !sampai.value) { const n = new Date(); dari.value = tglLokal(new Date(n.getFullYear(), n.getMonth(), 1)); sampai.value = tglLokal(n); }
      const sel = kagEl('kagFilterGuru'), cur = sel.value;
      sel.innerHTML = '<option value="">-- Semua Guru --</option>' + kagGuruList().map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.name)}</option>`).join('');
      sel.value = cur;
      kagEl('kagTambahBtn').style.display = isAdmin() ? '' : 'none';
      kagEl('kagModeInfo').textContent = isAdmin() ? '' : '👁️ Mode lihat saja (hanya Admin yang dapat mengubah).';
      loadKelolaAbsenGuru();
    }
    function loadKelolaAbsenGuru() {
      if (kagLoading) return;
      const dari = kagEl('kagDari').value, sampai = kagEl('kagSampai').value, list = kagEl('kagList');
      if (!dari || !sampai) return toast('Isi rentang tanggal!', true);
      if (dari > sampai) return toast('Tanggal "Dari" tidak boleh setelah "Sampai"!', true);
      if ((new Date(sampai) - new Date(dari)) / 86400000 > 92) return toast('Rentang maksimal 3 bulan. Persempit tanggalnya.', true);
      kagLoading = true;
      list.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Memuat catatan absen...</p>';
      db.ref('teacher_attendance').orderByChild('tanggal').startAt(dari).endAt(sampai).once('value').then(snap => {
        kagRows = []; snap.forEach(c => { const v = c.val() || {}; v.key = c.key; kagRows.push(v); });
        kagRange = { dari, sampai };
        kagLoading = false; renderKelolaAbsenGuru();
      }).catch(err => { kagLoading = false; list.innerHTML = `<p style="color:#dc2626;font-size:13px;">Gagal memuat: ${escapeHtml(err.message)}</p>`; });
    }
    // Unduh REKAP ABSENSI GURU (PDF formal berkop + tanda tangan Kepala) untuk rentang & guru yang sedang ditampilkan.
    // Memakai pembuat PDF yang sama dengan Ringkasan Sekolah (downloadRekapAbsensiGuru), mode ringkasan per guru.
    // Filter "Jenis" tidak dipakai (rekap harus memuat semua jenis); catatan Dobel dihitung satu.
    function kagUnduhRekapPdf() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const dari = kagEl('kagDari').value, sampai = kagEl('kagSampai').value;
      if (!kagRange || kagRange.dari !== dari || kagRange.sampai !== sampai) return toast('Rentang tanggal berubah. Klik "Tampilkan" dulu, baru unduh rekap.', true);
      const fg = kagEl('kagFilterGuru').value;
      const gObj = fg ? kagGuruList().find(g => g.key === fg) : null;
      const sudah = new Set();
      const data = kagRows.filter(a => !gObj || kagCocokGuru(a, gObj)).filter(a => {
        const k = a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type;
        if (sudah.has(k)) return false; sudah.add(k); return true;
      });
      const P = { bulanan: true, tgl: sampai, tag: dari + '_sd_' + sampai, judul: 'REKAP ABSENSI GURU', label: 'Periode: ' + rekapTglIndonesia(dari) + ' s.d. ' + rekapTglIndonesia(sampai), cocok: () => true };
      return window.downloadRekapAbsensiGuru({ P, filterGuru: fg, data });
    }
    function renderKelolaAbsenGuru() {
      const list = kagEl('kagList'), ringkas = kagEl('kagSummary'); if (!list) return;
      const fg = kagEl('kagFilterGuru').value, ft = kagEl('kagFilterJenis').value;
      const gObj = fg ? kagGuruList().find(g => g.key === fg) : null;
      const hitung = {};
      kagRows.forEach(a => { const k = a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type; hitung[k] = (hitung[k] || 0) + 1; });
      const urutan = { Datang: 1, Pulang: 2, Izin: 3, Sakit: 3, Alpha: 4 };
      let rows = kagRows.filter(a => (!gObj || kagCocokGuru(a, gObj)) && (!ft || a.type === ft))
        .sort((x, y) => COLLATOR_ID.compare((y.tanggal || ''), x.tanggal || '') || COLLATOR_ID.compare((x.guru || ''), y.guru || '') || (urutan[x.type] || 9) - (urutan[y.type] || 9));
      const dobel = rows.filter(a => hitung[a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type] > 1).length;
      const cnt = t => rows.filter(a => a.type === t).length;
      ringkas.innerHTML = `<span style="padding:4px 10px;border-radius:999px;background:#dcfce7;color:#065f46;">🌅 Datang ${cnt('Datang')}</span><span style="padding:4px 10px;border-radius:999px;background:#dbeafe;color:#1e40af;">🌇 Pulang ${cnt('Pulang')}</span><span style="padding:4px 10px;border-radius:999px;background:#fef3c7;color:#92400e;">📝 Izin ${cnt('Izin')} · 🤒 Sakit ${cnt('Sakit')}</span><span style="padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;">❌ Alpha ${cnt('Alpha')}</span>${dobel ? `<span style="padding:4px 10px;border-radius:999px;background:#fecaca;color:#7f1d1d;font-weight:700;">⚠️ Dobel ${dobel}</span>` : ''}`;
      if (!rows.length) { list.innerHTML = '<div class="text-muted border-muted" style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;">📭 Tidak ada catatan pada rentang/filter ini</div>'; return; }
      const terpotong = rows.length > 500; if (terpotong) rows = rows.slice(0, 500);
      const warna = { Datang: ['#dcfce7', '#065f46'], Pulang: ['#dbeafe', '#1e40af'], Izin: ['#fef3c7', '#92400e'], Sakit: ['#fef3c7', '#92400e'], Alpha: ['#fee2e2', '#991b1b'] };
      const metodeLabel = { qr_lokasi: '📍 QR+Lokasi', kamera_validasi: '📸 Kamera', otomatis_sistem: '🤖 Otomatis', manual_admin: '✍️ Admin' };
      const bisaUbah = isAdmin(), th = 'padding:8px 6px;';
      const body = rows.map(a => {
        const w = warna[a.type] || ['#f3f4f6', '#374151'];
        const wkt = a.waktu ? new Date(a.waktu) : null;
        const jam = (!KAG_HARI_PENUH.includes(a.type) && wkt && !isNaN(wkt)) ? wkt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
        const tgl = new Date(a.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        const isDobel = hitung[a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type] > 1;
        const ket = [a.keterangan ? escapeHtml(a.keterangan) : '', a.catatanKoreksi ? '<span class="text-muted">Koreksi: ' + escapeHtml(a.catatanKoreksi) + '</span>' : ''].filter(Boolean).join('<br>') || '-';
        const aksi = bisaUbah ? `<td style="${th}white-space:nowrap;"><button class="btn btn-soft" style="padding:3px 8px;font-size:12px;" data-key="${escapeHtml(a.key)}" onclick="kagBuka(this.dataset.key)" title="Edit">✏️</button> <button class="btn btn-danger" style="padding:3px 8px;font-size:12px;" data-key="${escapeHtml(a.key)}" onclick="kagHapus(this.dataset.key)" title="Hapus">🗑️</button></td>` : '';
        return `<tr style="border-bottom:1px solid #f1f5f9;${isDobel ? 'background:#fef2f2;' : ''}"><td style="${th}white-space:nowrap;">${escapeHtml(tgl)}</td><td style="${th}">${escapeHtml(a.guru || '-')}</td><td style="${th}"><span style="padding:2px 8px;border-radius:999px;background:${w[0]};color:${w[1]};font-weight:600;">${escapeHtml(a.type || '-')}</span>${isDobel ? ' <span style="color:#dc2626;font-weight:700;font-size:11px;">DOBEL</span>' : ''}</td><td style="${th}">${jam}</td><td style="${th}font-size:12px;">${metodeLabel[a.metode] || '📝 Manual'}${a.dikoreksi ? ' ✏️' : ''}</td><td style="${th}font-size:12px;">${ket}</td>${aksi}</tr>`;
      }).join('');
      list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:640px;"><thead><tr style="background:#f3f4f6;text-align:left;"><th style="${th}">Tanggal</th><th style="${th}">Guru</th><th style="${th}">Jenis</th><th style="${th}">Jam</th><th style="${th}">Metode</th><th style="${th}">Keterangan</th>${bisaUbah ? `<th style="${th}">Aksi</th>` : ''}</tr></thead><tbody>${body}</tbody></table>${terpotong ? '<p style="font-size:12px;color:#92400e;margin-top:8px;">Menampilkan 500 catatan pertama. Persempit rentang tanggal atau pilih guru.</p>' : ''}`;
    }
    function kagToggleJam() { kagEl('kagJamWrap').style.display = KAG_HARI_PENUH.includes(kagEl('kagJenis').value) ? 'none' : 'block'; }
    function kagBuka(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const rec = key ? kagRows.find(r => r.key === key) : null;
      if (key && !rec) return toast('Catatan tidak ditemukan. Muat ulang daftar.', true);
      kagGuruTambahan = null;
      let guruList = kagGuruList();
      let guruTerpilih = '';
      if (rec) {
        let g = guruList.find(x => kagCocokGuru(rec, x));
        if (!g) {
          // 1) Guru masih ada di data tapi perannya bukan guru/wali kelas (mis. kepala, TU, staf) -> tetap boleh diedit.
          const lain = (allGuru || []).find(x => kagCocokGuru(rec, x));
          if (lain) g = { key: lain.key, name: lain.name, kelas: lain.kelas || [], _tambahan: true };
          // 2) Guru sudah dihapus dari daftar, tapi catatan masih menyimpan guruKey + nama -> pakai data dari catatan.
          else if (rec.guruKey && rec.guru) g = { key: rec.guruKey, name: rec.guru, kelas: rec.kelas || [], _tambahan: true, _tidakTerdaftar: true };
        }
        if (!g) return toast('Catatan ini tidak punya ID guru (guruKey) dan namanya tidak ditemukan. Catatan hanya bisa dihapus.', true);
        if (g._tambahan) { kagGuruTambahan = g; guruList = kagGuruListForm(); }
        guruTerpilih = g.key;
      }
      kagEditKey = key || null;
      kagEl('kagModalTitle').textContent = rec ? '✏️ Edit Catatan Absen Guru' : '➕ Tambah Catatan Absen Guru';
      kagEl('kagGuru').innerHTML = guruList.map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.name)}${g._tidakTerdaftar ? ' (tidak terdaftar)' : ''}</option>`).join('');
      if (guruTerpilih) kagEl('kagGuru').value = guruTerpilih;
      kagEl('kagTanggal').value = rec ? rec.tanggal : tglLokal();
      kagEl('kagJenis').value = rec ? rec.type : 'Datang';
      let jam = '';
      if (rec && rec.waktu && !KAG_HARI_PENUH.includes(rec.type)) { const d = new Date(rec.waktu); if (!isNaN(d)) jam = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
      kagEl('kagJam').value = jam;
      kagEl('kagKet').value = rec ? (rec.keterangan || '') : '';
      kagEl('kagAlasan').value = '';
      kagToggleJam();
      kagEl('kagModal').classList.add('show');
    }
    function kagTutup() { kagEl('kagModal').classList.remove('show'); kagEditKey = null; kagGuruTambahan = null; }
    function kagSimpan() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (kagSaving) return;
      if (!isReallyOnline()) return toast('📡 Sedang offline. Simpan catatan absen butuh koneksi internet, coba lagi saat online.', true);
      const guru = kagGuruListForm().find(g => g.key === kagEl('kagGuru').value);
      const tanggal = kagEl('kagTanggal').value, jenis = kagEl('kagJenis').value, jam = kagEl('kagJam').value;
      const ket = kagEl('kagKet').value.trim(), alasan = kagEl('kagAlasan').value.trim();
      if (!guru || !tanggal || !KAG_TIPE.includes(jenis)) return toast('Lengkapi guru, tanggal, dan jenis!', true);
      if (!KAG_HARI_PENUH.includes(jenis) && !jam) return toast('Isi jam untuk Datang/Pulang!', true);
      if (!alasan) return toast('Isi alasan koreksi (jejak audit)!', true);
      const lama = kagEditKey ? kagRows.find(r => r.key === kagEditKey) : null;
      const oldKey = kagEditKey, newKey = `${tanggal}_${guru.key}_${jenis}`;
      kagSaving = true;
      db.ref('teacher_attendance/' + newKey).once('value').then(snap => {
        if (snap.exists() && newKey !== oldKey) throw { tampil: `Sudah ada catatan ${jenis} untuk ${guru.name} pada ${tanggal}. Edit atau hapus catatan itu dulu.` };
        return db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tanggal).once('value');
      }).then(snap => {
        const lain = [];
        snap.forEach(c => { const v = c.val() || {}; if (c.key === oldKey || c.key === newKey) return; if (kagCocokGuru(v, guru)) lain.push(v.type); });
        const bentrok = KAG_HARI_PENUH.includes(jenis) ? lain.length > 0 : lain.some(t => KAG_HARI_PENUH.includes(t));
        if (bentrok && !confirm(`Di tanggal ini ${guru.name} juga punya catatan: ${lain.join(', ')}.\n\nIzin/Sakit/Alpha adalah status satu hari penuh, jadi bisa bertabrakan dengan catatan lain.\n\nTetap simpan?`)) return false;
        // Rules teacher_attendance: `waktu` WAJIB angka (epoch-ms). Dulu disimpan sebagai teks ISO -> ditolak PERMISSION_DENIED.
        const waktuMsBaru = new Date(`${tanggal}T${KAG_HARI_PENUH.includes(jenis) ? '00:00' : jam}:00`).getTime();
        const rec = {
          tanggal, guru: guru.name, guruKey: guru.key, kelas: guru.kelas || [], waktu: waktuMsBaru, type: jenis,
          tahunAjaran: (lama && lama.tahunAjaran) || currentTahunAjaran,
          metode: lama ? (lama.metode || 'manual_admin') : 'manual_admin',
          keterangan: ket || null, catatanKoreksi: alasan, dikoreksi: true,
          diubahOleh: currentUser.name, diubahAt: new Date().toISOString()
        };
        const updates = {}; updates['teacher_attendance/' + newKey] = rec;
        if (oldKey && oldKey !== newKey) updates['teacher_attendance/' + oldKey] = null;
        return Promise.race([((typeof window.kredAdminSiap === 'function') ? Promise.resolve(window.kredAdminSiap()).catch(() => true) : Promise.resolve(true)), new Promise(r => setTimeout(r, 8000))]).then(() => db.ref().update(updates)).then(() => true);
      }).then(ok => {
        if (!ok) return;
        toastTersimpan(oldKey ? 'Catatan absen diperbarui' : 'Catatan absen ditambahkan');
        addLog(oldKey ? 'edit_absen_guru' : 'tambah_absen_guru', `${guru.name} - ${tanggal} - ${jenis}: ${alasan}`);
        kagTutup(); reloadDataset('teacherAttendance'); loadKelolaAbsenGuru();
      }).catch(e => toast('❌ ' + kagPesanGalat(e, 'Penyimpanan'), true, 8000))
        .finally(() => { kagSaving = false; });
    }
    function kagHapus(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const a = kagRows.find(r => r.key === key); if (!a) return toast('Catatan tidak ditemukan. Muat ulang daftar.', true);
      if (!doubleConfirm(`Hapus catatan ${a.type} untuk ${a.guru} (${a.tanggal})?\n\nTidak bisa dibatalkan.`)) return;
      Promise.race([((typeof window.kredAdminSiap === 'function') ? Promise.resolve(window.kredAdminSiap()).catch(() => true) : Promise.resolve(true)), new Promise(r => setTimeout(r, 8000))]).then(() => db.ref('teacher_attendance/' + key).remove()).then(() => {
        toast('🗑️ Catatan dihapus.');
        addLog('hapus_absen_guru', `${a.guru} - ${a.tanggal} - ${a.type}`);
        reloadDataset('teacherAttendance'); loadKelolaAbsenGuru();
      }).catch(err => toast('❌ ' + kagPesanGalat(err, 'Penghapusan'), true, 8000));
    }
    // ============================================================
    // KOREKSI ABSEN RELIGI GURU (khusus Admin)
    // ============================================================
    // Koreksi manual absen Sholat Dhuha/Dzuhur guru (node religi_attendance), ditempatkan sebagai kartu di
    // halaman "Kelola Absen Guru" (menu Religi untuk guru disembunyikan dari Admin). SENGAJA tidak memakai
    // syarat jam, hari, maupun absensi siswa seperti saveReligi() -- ini jalur koreksi Admin.
    // Honor ikut berubah otomatis: renderHonor()/renderHonorSlip() menghitung entri berstatus 'Hadir' dari
    // religi_attendance. Setiap koreksi dicatat lewat addLog() lengkap dengan nilai lama dan baru.
    // Struktur record: 1 record per guru per tanggal { tanggal, guru, guruKey, tahunAjaran, updatedAt,
    // sholat_dluha:{status,...}, sholat_dzuhur:{status,...} }. 'sholat_dluha' = Dhuha (nama field lama, jangan diubah).
    const KRG_SHOLAT = { sholat_dluha: 'Dhuha', sholat_dzuhur: 'Dzuhur' };
    const KRG_STATUS = ['Hadir', 'Tidak Hadir'];
    let krgSaving = false, krgSeq = 0, krgCache = { key: '', records: null };
    function krgEl(id) { return document.getElementById(id); }
    function krgRupiah(n) { return (n < 0 ? '−' : n > 0 ? '+' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
    function krgTarif(sholat) {
      try { return Number(v4GetHonorRates()[sholat === 'sholat_dluha' ? 'dluha' : 'dzuhur']) || 0; } catch (e) { return 0; }
    }
    // Ambil SEMUA record religi seorang guru pada satu tanggal langsung dari Firebase (bukan dari memori),
    // supaya nilai lama yang dicatat di log selalu data terbaru. Cocokkan guruKey dulu, fallback nama (record lama).
    function krgFetchRecords(tanggal, guru) {
      return db.ref('religi_attendance').orderByChild('tanggal').equalTo(tanggal).once('value').then(snap => {
        const out = [];
        snap.forEach(c => { const v = c.val() || {}; v.key = c.key; if (v.guruKey ? v.guruKey === guru.key : v.guru === guru.name) out.push(v); });
        return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      });
    }
    // aksi = 'Hadir' | 'Tidak Hadir' | 'hapus'. Honor menghitung SETIAP record berstatus Hadir, jadi record ganda
    // (guru yang sama, hari yang sama) dihitung terpisah -- `duplikat` dipakai untuk membersihkannya.
    function krgHitung(recs, sholat, aksi) {
      const punya = recs.filter(r => r[sholat]);
      const primary = punya[0] || recs[0] || null;
      const lama = primary && primary[sholat] ? primary[sholat] : null;
      const hadirLama = punya.filter(r => r[sholat].status === 'Hadir').length;
      const hadirBaru = aksi === 'Hadir' ? 1 : 0;
      return { primary, lama, duplikat: Math.max(0, punya.length - 1), delta: hadirBaru - hadirLama, rupiah: (hadirBaru - hadirLama) * krgTarif(sholat) };
    }
    // Susun update multi-path untuk SATU db.ref().update() (atomik). Tidak menyentuh field sholat lain.
    function krgSusunUpdate(p) {
      const base = 'religi_attendance/', updates = {};
      const lain = p.sholat === 'sholat_dluha' ? 'sholat_dzuhur' : 'sholat_dluha';
      const punya = p.recs.filter(r => r[p.sholat]);
      // Buang field sholat dari sebuah record; kalau record jadi kosong (tak punya sholat lain) hapus utuh.
      const buang = r => {
        if (r[lain]) { updates[base + r.key + '/' + p.sholat] = null; updates[base + r.key + '/updatedAt'] = p.now; }
        else updates[base + r.key] = null;
      };
      if (p.aksi === 'hapus') { punya.forEach(buang); return updates; }
      const entry = { status: p.aksi, dikoreksi: true, diubahOleh: p.adminNama, diubahAt: p.now, catatanKoreksi: p.alasan };
      if (p.h.primary) {
        updates[base + p.h.primary.key + '/' + p.sholat] = entry;
        updates[base + p.h.primary.key + '/updatedAt'] = p.now;
      } else {
        updates[base + p.newKey] = { tanggal: p.tanggal, guru: p.guru.name, guruKey: p.guru.key, tahunAjaran: p.tahunAjaran, updatedAt: p.now, [p.sholat]: entry };
      }
      punya.filter(r => !p.h.primary || r.key !== p.h.primary.key).forEach(buang); // bersihkan duplikat
      return updates;
    }
    function krgSetupCard() {
      if (!isAdmin()) return;
      const page = document.getElementById('page-kelola-absen-guru'); if (!page) return;
      let card = krgEl('krgCard');
      if (!card) {
        card = document.createElement('div');
        card.id = 'krgCard'; card.className = 'card';
        card.innerHTML = `<h3 style="margin:0 0 4px;font-size:16px;">🕌 Koreksi Absen Religi Guru</h3>
          <p class="text-muted" style="font-size:12px;margin:0 0 12px;">Khusus Admin. Tidak terkena syarat jam, hari, maupun absensi siswa. Honor guru ikut berubah otomatis dan setiap koreksi dicatat di Log Aktivitas. Mulai ${HONOR_SHOLAT_MULAI_CHECKIN}, koreksi memberi (Hadir) atau mencabut (Tidak Hadir) honor hari itu di atas hasil pemeriksaan check-in; pilih "Hapus catatan" untuk kembali ke hasil sistem.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
            <div><label class="label">Guru</label><select id="krgGuru" class="field" onchange="krgPreview()"></select></div>
            <div><label class="label">Tanggal</label><input type="date" id="krgTanggal" class="field" onchange="krgPreview()"></div>
            <div><label class="label">Sholat</label><select id="krgSholat" class="field" onchange="krgPreview()"><option value="sholat_dluha">☀️ Dhuha</option><option value="sholat_dzuhur">🕌 Dzuhur</option></select></div>
            <div><label class="label">Status</label><select id="krgStatus" class="field" onchange="krgPreview()"><option value="Hadir">✅ Hadir</option><option value="Tidak Hadir">❌ Tidak Hadir</option><option value="hapus">🗑️ Hapus catatan</option></select></div>
          </div>
          <div style="margin-top:10px;"><label class="label">Alasan koreksi (wajib)</label><input type="text" id="krgAlasan" class="field" maxlength="200" placeholder="mis. Lupa absen, sudah dikonfirmasi Kepala Madrasah"></div>
          <div id="krgPreview" style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;font-size:13px;line-height:1.6;"></div>
          <button id="krgBtn" class="btn btn-success" style="margin-top:10px;" onclick="krgSimpan()">💾 Simpan Koreksi</button>`;
        page.appendChild(card);
      }
      const sel = krgEl('krgGuru'), cur = sel.value;
      sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + kagGuruList().map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.name)}</option>`).join('');
      sel.value = cur;
      if (!krgEl('krgTanggal').value) krgEl('krgTanggal').value = tglLokal();
      krgCache = { key: '', records: null };
      krgPreview();
    }
    function krgPreview() {
      const box = krgEl('krgPreview'); if (!box) return;
      const g = kagGuruList().find(x => x.key === krgEl('krgGuru').value), tanggal = krgEl('krgTanggal').value;
      if (!g || !tanggal) { box.innerHTML = '<span class="text-muted">Pilih guru dan tanggal untuk melihat data saat ini.</span>'; return; }
      if (tanggal >= HONOR_SHOLAT_MULAI_CHECKIN) return krgPreviewBaru(box, g, tanggal);
      const ck = g.key + '|' + tanggal;
      if (krgCache.key === ck && krgCache.records) return krgRenderPreview(g, krgCache.records);
      const seq = ++krgSeq;
      box.innerHTML = '<span class="text-muted">Memuat data...</span>';
      krgFetchRecords(tanggal, g).then(recs => {
        if (seq !== krgSeq) return; // jawaban basi (guru/tanggal sudah diganti lagi)
        krgCache = { key: ck, records: recs };
        krgRenderPreview(g, recs);
      }).catch(err => { if (seq !== krgSeq) return; krgCache = { key: '', records: null }; box.innerHTML = `<span style="color:#dc2626;">Gagal memuat: ${escapeHtml(err && err.message || String(err))}</span>`; });
    }
    function krgRenderPreview(g, recs) {
      const box = krgEl('krgPreview'); if (!box) return;
      const sholat = krgEl('krgSholat').value, aksi = krgEl('krgStatus').value;
      const ringkas = k => { const p = recs.filter(r => r[k]); return p.length ? p.map(r => escapeHtml(r[k].status || '-') + (r[k].dikoreksi ? ' ✏️' : '')).join(' + ') + (p.length > 1 ? ' ⚠️ ganda' : '') : 'belum ada catatan'; };
      const h = krgHitung(recs, sholat, aksi);
      const lamaTxt = h.lama ? escapeHtml(h.lama.status || '-') : '(kosong)', baruTxt = aksi === 'hapus' ? '(dihapus)' : escapeHtml(aksi);
      box.innerHTML = `<div>☀️ Dhuha: <b>${ringkas('sholat_dluha')}</b> &nbsp;·&nbsp; 🕌 Dzuhur: <b>${ringkas('sholat_dzuhur')}</b></div>
        <div>Perubahan ${KRG_SHOLAT[sholat]}: <b>${lamaTxt}</b> → <b>${baruTxt}</b> &nbsp;·&nbsp; Dampak honor: <b style="color:${h.rupiah < 0 ? '#dc2626' : h.rupiah > 0 ? '#059669' : 'inherit'};">${krgRupiah(h.rupiah)}</b></div>`;
    }
    // ---- Koreksi untuk tanggal >= HONOR_SHOLAT_MULAI_CHECKIN: disimpan di honor_koreksi_sholat/<tanggal>_<sholat>_<guruKey> ----
    // aksi 'Hadir' = honor dihitung; 'Tidak Hadir' = honor dicabut; 'hapus' = hapus koreksi (kembali ke hasil pemeriksaan sistem).
    function krgBaruHitung(hasil, g, tanggal, sholat, aksi) {
      const e = hasil.entri[honorSholatResolve(g.key, g.name) + '|' + tanggal + '|' + sholat] || null;
      const sekarang = !!(e && e.lolos), sistem = !!(e && e.sistemLolos), baru = aksi === 'hapus' ? sistem : aksi === 'Hadir';
      return { e, sekarang, sistem, baru, rupiah: ((baru ? 1 : 0) - (sekarang ? 1 : 0)) * krgTarif(sholat) };
    }
    function krgPreviewBaru(box, g, tanggal) {
      const sholat = krgEl('krgSholat').value, aksi = krgEl('krgStatus').value;
      const hs = honorSholatDapat(tanggal.slice(0, 4), tanggal.slice(5, 7), () => krgPreview());
      if (!hs.siap) { box.innerHTML = hs.gagal ? `<span style="color:#dc2626;">Gagal memuat: ${escapeHtml(hs.gagal)}</span>` : '<span class="text-muted">Memeriksa check-in dan absensi siswa...</span>'; return; }
      const h = krgBaruHitung(hs.hasil, g, tanggal, sholat, aksi), e = h.e;
      const sistemTxt = !e ? 'tidak ada check-in' : (e.sistemLolos ? '✅ lolos (dihitung)' : '❌ ' + escapeHtml(e.alasanSistem.join('; ')));
      const korTxt = e && e.koreksi ? `${escapeHtml(e.koreksi.aksi)} oleh ${escapeHtml(e.koreksi.oleh || '-')}${e.koreksi.alasan ? ' (' + escapeHtml(e.koreksi.alasan) + ')' : ''}` : 'tidak ada';
      const lbl = v => v ? 'dihitung' : 'tidak dihitung';
      box.innerHTML = `<div>${KRG_SHOLAT[sholat]} ${escapeHtml(tanggal)} · Hasil sistem: <b>${sistemTxt}</b></div>
        <div>Koreksi Admin saat ini: <b>${korTxt}</b></div>
        <div>Perubahan: <b>${lbl(h.sekarang)}</b> → <b>${lbl(h.baru)}</b> &nbsp;·&nbsp; Dampak honor: <b style="color:${h.rupiah < 0 ? '#dc2626' : h.rupiah > 0 ? '#059669' : 'inherit'};">${krgRupiah(h.rupiah)}</b></div>`;
    }
    function krgSimpanBaru(guru, tanggal, sholat, aksi, alasan) {
      if (krgSaving) return;
      const hs = honorSholatDapat(tanggal.slice(0, 4), tanggal.slice(5, 7), null);
      if (!hs.siap) return toast('⏳ Hasil pemeriksaan sistem belum siap. Tunggu sebentar, lalu simpan lagi.', true);
      const label = KRG_SHOLAT[sholat], h = krgBaruHitung(hs.hasil, guru, tanggal, sholat, aksi), ada = h.e && h.e.koreksi;
      if (aksi === 'hapus' && !ada) return toast(`Tidak ada koreksi ${label} untuk ${guru.name} pada ${tanggal}, jadi tidak ada yang dihapus.`, true);
      if (aksi !== 'hapus' && ada && ada.aksi === aksi) return toast(`Tidak ada perubahan: koreksi ${label} ${guru.name} pada ${tanggal} sudah ${aksi}.`, true);
      const tglTampil = new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      const pesan = `Koreksi honor sholat\n\nGuru: ${guru.name}\nTanggal: ${tglTampil}\nSholat: ${label}\nHasil sistem: ${h.e ? (h.e.sistemLolos ? 'lolos' : 'tidak lolos (' + h.e.alasanSistem.join('; ') + ')') : 'tidak ada check-in'}\nPerubahan: ${h.sekarang ? 'dihitung' : 'tidak dihitung'} → ${h.baru ? 'dihitung' : 'tidak dihitung'}\nDampak honor: ${krgRupiah(h.rupiah)}\nAlasan: ${alasan}` + (tanggal > tglLokal() ? '\n\n⚠️ Tanggal ini di MASA DEPAN.' : '') + '\n\nSimpan?';
      if (!(aksi === 'hapus' ? doubleConfirm(pesan) : confirm(pesan))) return;
      const ref = db.ref('honor_koreksi_sholat/' + tanggal + '_' + sholat + '_' + guru.key), btn = krgEl('krgBtn');
      krgSaving = true; if (btn) btn.disabled = true;
      const op = adminSesi().then(() => (aksi === 'hapus' ? ref.remove() : ref.set({ tanggal, sholat, guruKey: guru.key, guruName: guru.name, aksi, alasan, oleh: currentUser.name, at: new Date().toISOString(), tahunAjaran: currentTahunAjaran })));   // Rules: honor_koreksi_sholat hanya bisa ditulis sesi Admin
      op.then(() => {
        toastTersimpan(`Dampak honor ${guru.name}: ${krgRupiah(h.rupiah)}`);
        addLog('koreksi_honor_sholat', `${guru.name} | ${tanggal} | ${label}: ${aksi} | ${h.sekarang ? 'dihitung' : 'tidak dihitung'} → ${h.baru ? 'dihitung' : 'tidak dihitung'} | honor ${krgRupiah(h.rupiah)} | alasan: ${alasan}`);
        honorSholatInvalidate(); krgEl('krgAlasan').value = ''; krgPreview();
      }).catch(e => toast('❌ ' + kagPesanGalat(e, 'Penyimpanan'), true, 8000))
        .finally(() => { krgSaving = false; if (btn) btn.disabled = false; });
    }
    function krgMuatUlangReligi() {
      const owner = currentUser && currentUser.key;
      db.ref('religi_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value').then(snap => {
        if (!currentUser || currentUser.key !== owner) return;
        const baru = []; snap.forEach(c => { const v = c.val() || {}; v.key = c.key; baru.push(v); });
        allReligiAttendance = baru;
        if (dataLoaded) cacheDatasetsToIndexedDB(owner);
      }).catch(err => console.warn('[SI MAMBA] Gagal memuat ulang religi_attendance:', err && err.message || err));
    }
    function krgSimpan() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (krgSaving) return;
      if (!navigator.onLine) return toast('Koreksi absen religi butuh koneksi internet.', true);
      const guru = kagGuruList().find(g => g.key === krgEl('krgGuru').value);
      const tanggal = krgEl('krgTanggal').value, sholat = krgEl('krgSholat').value, aksi = krgEl('krgStatus').value, alasan = krgEl('krgAlasan').value.trim();
      if (!guru) return toast('Pilih guru!', true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || isNaN(new Date(tanggal + 'T00:00:00'))) return toast('Isi tanggal yang valid!', true);
      if (!KRG_SHOLAT[sholat]) return toast('Pilih sholat!', true);
      if (aksi !== 'hapus' && !KRG_STATUS.includes(aksi)) return toast('Pilih status!', true);
      if (!alasan) return toast('Isi alasan koreksi (jejak audit honor)!', true);
      if (tanggal >= HONOR_SHOLAT_MULAI_CHECKIN) return krgSimpanBaru(guru, tanggal, sholat, aksi, alasan);
      const btn = krgEl('krgBtn'), label = KRG_SHOLAT[sholat];
      krgSaving = true; if (btn) btn.disabled = true;
      krgFetchRecords(tanggal, guru).then(recs => {
        const h = krgHitung(recs, sholat, aksi);
        if (aksi === 'hapus' && !h.lama) throw { tampil: `Tidak ada catatan ${label} untuk ${guru.name} pada ${tanggal}, jadi tidak ada yang dihapus.` };
        if (h.lama && h.lama.status === aksi && !h.duplikat) throw { tampil: `Tidak ada perubahan: ${label} ${guru.name} pada ${tanggal} sudah berstatus ${aksi}.` };
        const lamaTxt = h.lama ? h.lama.status : '(kosong)', baruTxt = aksi === 'hapus' ? '(dihapus)' : aksi;
        const tglTampil = new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const pesan = `Koreksi absen religi\n\nGuru: ${guru.name}\nTanggal: ${tglTampil}\nSholat: ${label}\nPerubahan: ${lamaTxt} → ${baruTxt}\nDampak honor: ${krgRupiah(h.rupiah)}\nAlasan: ${alasan}`
          + (tanggal > tglLokal() ? '\n\n⚠️ Tanggal ini di MASA DEPAN.' : '')
          + (h.duplikat ? `\n\nℹ️ Ada ${h.duplikat} catatan ${label} ganda pada hari ini; akan dibersihkan supaya honor tidak terhitung dobel.` : '')
          + '\n\nSimpan?';
        if (!(aksi === 'hapus' ? doubleConfirm(pesan) : confirm(pesan))) return null;
        const updates = krgSusunUpdate({ guru, tanggal, sholat, aksi, alasan, recs, h, now: new Date().toISOString(), adminNama: currentUser.name, tahunAjaran: currentTahunAjaran, newKey: db.ref('religi_attendance').push().key });
        return db.ref().update(updates).then(() => ({ h, lamaTxt, baruTxt }));
      }).then(res => {
        if (!res) return;
        toastTersimpan(`Dampak honor ${guru.name}: ${krgRupiah(res.h.rupiah)}`);
        addLog('koreksi_religi_guru', `${guru.name} | ${tanggal} | ${label}: ${res.lamaTxt} → ${res.baruTxt} | honor ${krgRupiah(res.h.rupiah)}${res.h.duplikat ? ' | duplikat dibersihkan: ' + res.h.duplikat : ''} | alasan: ${alasan}`);
        krgCache = { key: '', records: null };
        krgEl('krgAlasan').value = '';
        krgMuatUlangReligi(); krgPreview();
      }).catch(e => toast('❌ ' + kagPesanGalat(e, 'Penyimpanan'), true, 8000))
        .finally(() => { krgSaving = false; if (btn) btn.disabled = false; });
    }

