/* ============================================================
   SI MAMBA - js/monitor-petugas.js
   Kartu "Petugas & Penanggung Jawab" di Dashboard untuk Admin & Kepala Madrasah.
   Lihat saja, kecuali tombol "Ingatkan" (kirim pengingat WA ke petugas).

   TABEL 1 - PER KELAS (satu baris per kelas di KELAS_LIST)
   - Petugas Infaq        : allInfaqPetugas[kelas]; terakhir = inputAt terbaru di allInfaqSiswa (kelas itu)
   - PJ Tahfidz           : V4.tahfidzPic[kelas];   terakhir = tanggal terbaru di V4.tahfidz (kelas itu)
   - Pembina Pramuka      : V4.pramukaPic[kelas];   terakhir = updatedAt terbaru di V4.pramukaSku (kelas itu)

   TABEL 2 - KEGIATAN & EKSKUL
   - Kegiatan (V4.activityTypes): PJ = picName; terakhir = tanggal terbaru di V4.activityAttendance
   - Ekskul (V4.ekskuls): satu baris per tingkat (rendah/tinggi) yang punya PIC;
     terakhir = tanggal terbaru di V4.ekskulAttendance untuk kelas di tingkat itu

   PENANDA
   - "Belum ditunjuk"   : belum ada petugas/PJ/pembina.
   - "Lama tidak input" : petugas ada, tapi catatan terakhir lebih dari batas hari (MONITOR_BATAS_*) atau
                          belum pernah ada catatan. Hitungan hari biasa, TIDAK mengenal kalender libur:
                          saat libur sekolah, tanda ini wajar muncul.
   - Kalau datanya belum termuat sama sekali, kolom "terakhir" menampilkan "-" tanpa penanda
     (supaya tidak ada peringatan palsu saat data masih diambil).

   KETERGANTUNGAN (app.js)
   - KELAS_LIST, allInfaqPetugas, allInfaqSiswa, allGuru, V4, MADRASAH, isAdmin, isKepsek, escapeHtml,
     escapeJs, kirimWA, formatNomorWa, addLog, toast.
   - Tombol "Ingatkan": nomor WA petugas dibaca dari guru.noWa (diisi di Edit Guru). Kalau kosong,
     WhatsApp dibuka dengan pesan siap kirim dan pengirim memilih kontaknya sendiri.
   - Dimuat SESUDAH js/app.js; dipicu dari renderChartsNow() (dashboard) dan akhir v4RenderTahfidz().
     Kartu disisipkan tepat di bawah panel "Ringkasan Madrasah" (#dashboardKepsekExtraWrap).
============================================================ */
const MONITOR_BATAS_INFAQ_HARI = 10;     // infaq dicatat mingguan
const MONITOR_BATAS_TAHFIDZ_HARI = 14;
const MONITOR_BATAS_PRAMUKA_HARI = 30;   // penilaian SKU tidak tiap minggu
const MONITOR_BATAS_KEGIATAN_HARI = 10;
const MONITOR_BATAS_EKSKUL_HARI = 14;

function monitorHariLalu(tglIsoAtauYmd) {
  if (!tglIsoAtauYmd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tglIsoAtauYmd));
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(tglIsoAtauYmd);
  if (isNaN(d.getTime())) return null;
  const kini = new Date(), a = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((a - b) / 86400000));
}
function monitorLabelHari(n) { return n === 0 ? 'hari ini' : n === 1 ? 'kemarin' : n + ' hari lalu'; }
function monitorTingkatEkskul(kelas) {
  if (typeof v4EkskulTierForKelas === 'function') return v4EkskulTierForKelas(kelas);
  return (parseInt(String(kelas).replace(/\D/g, ''), 10) || 0) <= 3 ? 'rendah' : 'tinggi';
}
function monitorTerbaru(daftar, ambilWaktu, ambilOleh) {      // -> { w, oleh } | null ; w = string yang bisa dibandingkan
  let hasil = null;
  daftar.forEach(x => { const w = ambilWaktu(x); if (w && (!hasil || w > hasil.w)) hasil = { w, oleh: ambilOleh(x) || '' }; });
  return hasil;
}
function monitorBlok(pic, dataAda, terbaru) {
  return { nama: pic ? (pic.name || pic.picName || '') || null : null, dataAda, oleh: terbaru ? terbaru.oleh : '', hari: terbaru ? monitorHariLalu(terbaru.w) : null };
}

// Data murni (tanpa DOM). -> { kelas: [{kelas, infaq, tahfidz, pramuka}], lain: [{jenis, kunci, judul, blok}] }
function monitorHitung() {
  const infaqAda = Array.isArray(allInfaqSiswa) && allInfaqSiswa.length > 0;
  const tahfidzAda = !!(V4 && Array.isArray(V4.tahfidz) && V4.tahfidz.length > 0);
  const pramukaAda = !!(V4 && Array.isArray(V4.pramukaSku) && V4.pramukaSku.length > 0);
  const kegiatanAda = !!(V4 && Array.isArray(V4.activityAttendance) && V4.activityAttendance.length > 0);
  const ekskulAda = !!(V4 && Array.isArray(V4.ekskulAttendance) && V4.ekskulAttendance.length > 0);
  const valid = t => { const n = new Date(t).getTime(); return !isNaN(n); };
  const kelas = KELAS_LIST.map(k => {
    const pi = allInfaqPetugas && allInfaqPetugas[k], pt = V4 && V4.tahfidzPic && V4.tahfidzPic[k], pp = V4 && V4.pramukaPic && V4.pramukaPic[k];
    const li = infaqAda ? monitorTerbaru((allInfaqSiswa || []).filter(it => it && it.kelas === k && it.inputAt && valid(it.inputAt)), it => it.inputAt, it => it.inputBy) : null;
    const lt = tahfidzAda ? monitorTerbaru(V4.tahfidz.filter(x => x && x.kelas === k && x.tanggal), x => x.tanggal, x => x.guru) : null;
    const lp = pramukaAda ? monitorTerbaru(V4.pramukaSku.filter(x => x && x.kelas === k && x.updatedAt && valid(x.updatedAt)), x => x.updatedAt, x => x.updatedBy) : null;
    return { kelas: k, infaq: monitorBlok(pi, infaqAda, li), tahfidz: monitorBlok(pt, tahfidzAda, lt), pramuka: monitorBlok(pp, pramukaAda, lp) };
  });
  const lain = [];
  ((V4 && V4.activityTypes) || []).forEach(t => {
    const l = kegiatanAda ? monitorTerbaru(V4.activityAttendance.filter(r => r && r.activityTypeId === t.key && r.tanggal), r => r.tanggal, r => r.recordedBy) : null;
    lain.push({ jenis: 'kegiatan', kunci: t.key, judul: t.name || '(tanpa nama)', blok: monitorBlok(t.picName ? { name: t.picName } : null, kegiatanAda, l) });
  });
  ((V4 && V4.ekskuls) || []).forEach(ex => {
    ['rendah', 'tinggi'].forEach(tk => {
      const tier = ex.tiers && ex.tiers[tk];
      if (!tier || !tier.picName) return;                                   // tingkat yang tidak dipakai ekskul ini tidak ditampilkan
      const l = ekskulAda ? monitorTerbaru(V4.ekskulAttendance.filter(r => r && r.ekskulId === ex.key && r.tanggal && monitorTingkatEkskul(r.kelas) === tk), r => r.tanggal, r => r.recordedBy) : null;
      lain.push({ jenis: 'ekskul', kunci: ex.key + '|' + tk, judul: `${ex.name || '(tanpa nama)'} (${tier.label || (tk === 'rendah' ? 'Kelas 1-3' : 'Kelas 4-6')})`, blok: monitorBlok({ name: tier.picName }, ekskulAda, l) });
    });
  });
  return { kelas, lain };
}

const MONITOR_BATAS = { infaq: MONITOR_BATAS_INFAQ_HARI, tahfidz: MONITOR_BATAS_TAHFIDZ_HARI, pramuka: MONITOR_BATAS_PRAMUKA_HARI, kegiatan: MONITOR_BATAS_KEGIATAN_HARI, ekskul: MONITOR_BATAS_EKSKUL_HARI };

function monitorSel(blok, jenis, kunci, bolehKirim) {
  const merah = '#b91c1c', kuning = '#b45309', abu = '#6b7280', batas = MONITOR_BATAS[jenis];
  if (!blok.nama) return { petugas: `<span style="color:${merah};font-weight:700;">⚠️ Belum ditunjuk</span>`, terakhir: `<span style="color:${abu};">-</span>`, masalah: 'belum' };
  let terakhir, masalah = '';
  if (!blok.dataAda) terakhir = `<span style="color:${abu};">-</span>`;
  else if (blok.hari === null) { terakhir = `<span style="color:${kuning};font-weight:600;">Belum pernah input</span>`; masalah = 'lama'; }
  else if (blok.hari > batas) { terakhir = `<span style="color:${kuning};font-weight:600;">⏳ ${monitorLabelHari(blok.hari)} — lama tidak input</span>`; masalah = 'lama'; }
  else terakhir = `<span>${monitorLabelHari(blok.hari)}</span>`;
  if (blok.oleh && blok.hari !== null && blok.oleh !== blok.nama) terakhir += `<div style="font-size:10px;color:${abu};">oleh ${escapeHtml(blok.oleh)}</div>`;
  if (masalah === 'lama' && bolehKirim) terakhir += `<div style="margin-top:3px;"><button class="btn" style="padding:2px 8px;font-size:10px;background:#25D366;color:white;" onclick="monitorIngatkan('${jenis}','${escapeJs(kunci)}')">📲 Ingatkan</button></div>`;
  return { petugas: `<strong>${escapeHtml(blok.nama)}</strong>`, terakhir, masalah };
}

// ---- Pengingat WA ke petugas (Admin & Kepsek) ----
const MONITOR_TUGAS = {
  infaq: ['pencatat infaq mingguan', 'melanjutkan pencatatan infaq mingguan siswa'],
  tahfidz: ['penanggung jawab tahfidz', 'melanjutkan pencatatan setoran/murojaah tahfidz siswa'],
  pramuka: ['pembina Pramuka', 'melanjutkan penilaian SKU Pramuka siswa'],
  kegiatan: ['penanggung jawab kegiatan', 'melanjutkan pencatatan kehadiran siswa pada kegiatan ini'],
  ekskul: ['pembina ekstrakurikuler', 'melanjutkan pencatatan absensi ekstrakurikuler']
};
function monitorPesan(jenis, lokasi, blok) {
  const kapan = blok.hari === null ? 'belum ada catatan sama sekali' : `catatan terakhir ${monitorLabelHari(blok.hari)}`;
  const [tugas, aksi] = MONITOR_TUGAS[jenis];
  return `Assalamu'alaikum, Bapak/Ibu ${blok.nama}.\n\nKami mengingatkan bahwa Bapak/Ibu tercatat sebagai ${tugas} untuk *${lokasi}*, dan ${kapan}.\n\nMohon berkenan ${aksi} di aplikasi SI MAMBA. Jika ada kendala, silakan sampaikan kepada kami. Terima kasih.\n\n- ${MADRASAH.nama}`;
}
// Cari entri (blok + pic + nama lokasi) berdasarkan jenis & kunci. kunci: kelas | id kegiatan | "idEkskul|tingkat".
function monitorCari(jenis, kunci) {
  const data = monitorHitung();
  if (jenis === 'infaq' || jenis === 'tahfidz' || jenis === 'pramuka') {
    const row = data.kelas.find(r => r.kelas === kunci); if (!row) return null;
    const pic = jenis === 'infaq' ? (allInfaqPetugas && allInfaqPetugas[kunci]) : jenis === 'tahfidz' ? (V4 && V4.tahfidzPic && V4.tahfidzPic[kunci]) : (V4 && V4.pramukaPic && V4.pramukaPic[kunci]);
    return { blok: row[jenis], pic, lokasi: kunci };
  }
  const item = data.lain.find(x => x.jenis === jenis && x.kunci === kunci); if (!item) return null;
  let pic;
  if (jenis === 'kegiatan') { const t = ((V4 && V4.activityTypes) || []).find(x => x.key === kunci); pic = t ? { key: t.picKey, name: t.picName } : null; }
  else { const [ek, tk] = kunci.split('|'); const ex = ((V4 && V4.ekskuls) || []).find(x => x.key === ek); const tier = ex && ex.tiers && ex.tiers[tk]; pic = tier ? { key: tier.picKey, name: tier.picName } : null; }
  return { blok: item.blok, pic, lokasi: item.judul };
}
function monitorIngatkan(jenis, kunci) {
  if (!((typeof isAdmin === 'function' && isAdmin()) || (typeof isKepsek === 'function' && isKepsek()))) return toast('Tidak diizinkan!', true);
  if (!MONITOR_TUGAS[jenis]) return;
  const hit = monitorCari(jenis, kunci); if (!hit) return;
  if (!hit.blok || !hit.blok.nama) return toast('Belum ada petugas yang ditunjuk.', true);
  const guru = (allGuru || []).find(g => hit.pic && ((hit.pic.key && g.key === hit.pic.key) || g.name === hit.pic.name));
  const pesan = monitorPesan(jenis, hit.lokasi, hit.blok);
  if (guru && guru.noWa && formatNomorWa(guru.noWa).length >= 10) kirimWA(guru.noWa, pesan);
  else { window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank'); toast('ℹ️ Nomor WA petugas belum diisi (Edit Guru). Pilih kontaknya langsung di WhatsApp.', false, 5000); }
  try { addLog('ingatkan_petugas', `${jenis} - ${hit.lokasi} - ${hit.blok.nama}`); } catch (e) { console.error('[SI MAMBA] addLog ingatkan petugas gagal:', e); }
}

function monitorEnsureWadah() {
  let el = document.getElementById('dashboardPetugasWrap');
  if (el) return el;
  const anchor = document.getElementById('dashboardKepsekExtraWrap');
  if (!anchor) return null;                     // panel Ringkasan belum dibuat; dicoba lagi pada render berikutnya
  el = document.createElement('div'); el.id = 'dashboardPetugasWrap';
  anchor.insertAdjacentElement('afterend', el);
  return el;
}
function petugasMonitorRender() {
  const el = monitorEnsureWadah(); if (!el) return;
  const boleh = (typeof isAdmin === 'function' && isAdmin()) || (typeof isKepsek === 'function' && isKepsek());
  if (!boleh) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  const data = monitorHitung();
  const hit = { belum: { infaq: 0, tahfidz: 0, pramuka: 0, kegiatan: 0, ekskul: 0 }, lama: { infaq: 0, tahfidz: 0, pramuka: 0, kegiatan: 0, ekskul: 0 } };
  const hitung = (s, jenis) => { if (s.masalah === 'belum') hit.belum[jenis]++; else if (s.masalah === 'lama') hit.lama[jenis]++; return s; };
  const baris = data.kelas.map(r => {
    const i = hitung(monitorSel(r.infaq, 'infaq', r.kelas, boleh), 'infaq'), t = hitung(monitorSel(r.tahfidz, 'tahfidz', r.kelas, boleh), 'tahfidz'), p = hitung(monitorSel(r.pramuka, 'pramuka', r.kelas, boleh), 'pramuka');
    return `<tr><td style="font-weight:600;white-space:nowrap;vertical-align:top;">${escapeHtml(r.kelas)}</td>
      <td style="vertical-align:top;">${i.petugas}</td><td style="vertical-align:top;font-size:12px;">${i.terakhir}</td>
      <td style="vertical-align:top;">${t.petugas}</td><td style="vertical-align:top;font-size:12px;">${t.terakhir}</td>
      <td style="vertical-align:top;">${p.petugas}</td><td style="vertical-align:top;font-size:12px;">${p.terakhir}</td></tr>`;
  }).join('');
  const barisLain = data.lain.map(x => {
    const s = hitung(monitorSel(x.blok, x.jenis, x.kunci, boleh), x.jenis);
    return `<tr><td style="vertical-align:top;white-space:nowrap;font-size:12px;">${x.jenis === 'kegiatan' ? '🕌 Kegiatan' : '🏅 Ekskul'}</td><td style="font-weight:600;vertical-align:top;">${escapeHtml(x.judul)}</td>
      <td style="vertical-align:top;">${s.petugas}</td><td style="vertical-align:top;font-size:12px;">${s.terakhir}</td></tr>`;
  }).join('');
  const total = data.kelas.length;
  const namaJenis = { infaq: 'petugas infaq', tahfidz: 'PJ tahfidz', pramuka: 'pembina Pramuka' };
  const masalah = [];
  ['infaq', 'tahfidz', 'pramuka'].forEach(j => { if (hit.belum[j]) masalah.push(`${hit.belum[j]} dari ${total} kelas belum punya ${namaJenis[j]}`); });
  if (hit.belum.kegiatan) masalah.push(`${hit.belum.kegiatan} kegiatan belum punya PJ`);
  ['infaq', 'tahfidz', 'pramuka'].forEach(j => { if (hit.lama[j]) masalah.push(`${hit.lama[j]} kelas lama tidak ada catatan ${j === 'infaq' ? 'infaq' : j === 'tahfidz' ? 'tahfidz' : 'SKU Pramuka'}`); });
  if (hit.lama.kegiatan) masalah.push(`${hit.lama.kegiatan} kegiatan lama tidak dicatat`);
  if (hit.lama.ekskul) masalah.push(`${hit.lama.ekskul} ekskul lama tidak dicatat`);
  const ringkas = masalah.length ? masalah.join(' • ') : '<span style="color:#047857;">✅ Semua petugas sudah ditunjuk dan catatannya masih baru.</span>';
  el.innerHTML = `<div class="dash-panel" style="margin-top:20px;">
      <h3 style="margin-bottom:4px;">👥 Petugas &amp; Penanggung Jawab</h3>
      <div style="font-size:12px;margin-bottom:10px;color:#92400e;">${ringkas}</div>
      <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Petugas Infaq</th><th>Input Infaq Terakhir</th><th>PJ Tahfidz</th><th>Catatan Tahfidz Terakhir</th><th>Pembina Pramuka</th><th>Penilaian SKU Terakhir</th></tr></thead><tbody>${baris}</tbody></table></div>
      ${barisLain ? `<h4 style="font-size:13px;margin:14px 0 6px;">Kegiatan &amp; Ekstrakurikuler</h4>
      <div style="overflow-x:auto;"><table><thead><tr><th>Jenis</th><th>Nama</th><th>PJ / Pembina</th><th>Catatan Terakhir</th></tr></thead><tbody>${barisLain}</tbody></table></div>` : ''}
      <p style="font-size:10px;color:#6b7280;margin-top:8px;">Penunjukan dilakukan Admin di halaman masing-masing. Tanda "lama tidak input" memakai batas ${MONITOR_BATAS_INFAQ_HARI} hari (infaq), ${MONITOR_BATAS_TAHFIDZ_HARI} hari (tahfidz), ${MONITOR_BATAS_PRAMUKA_HARI} hari (SKU Pramuka), ${MONITOR_BATAS_KEGIATAN_HARI} hari (kegiatan), ${MONITOR_BATAS_EKSKUL_HARI} hari (ekskul) dan tidak mengenal hari libur.</p>
    </div>`;
}
