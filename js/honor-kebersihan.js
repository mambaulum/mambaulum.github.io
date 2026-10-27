// ============================================================
// honor-kebersihan.js -- HONOR PETUGAS KEBERSIHAN (input MANUAL, tanpa QR)
// ============================================================
// Tab "🧹 Petugas Kebersihan" di halaman Honor (hanya Admin yang boleh mengubah; Kepala Madrasah hanya melihat).
// Cara kerja: Admin mencentang tanggal petugas masuk pada kalender bulanan, lalu menekan Simpan. Setiap tanggal dibandingkan
// dengan HARI LIBUR: Minggu (bukan hari kerja) + hari libur di Kalender Akademik (tanggalLiburKalender() di honor-guru.js).
//   - Hari efektif       = hari kerja yang BUKAN libur.
//   - Hadir              = tanggal efektif yang dicentang -> dibayar (tarif x hari).
//   - Tidak hadir        = tanggal efektif yang sudah lewat dan tidak dicentang.
//   - Hadir di hari libur = tanggal libur yang dicentang -> ditandai oranye dan TIDAK dibayar, kecuali kotak
//                           "Hari libur ikut dibayar" dicentang untuk petugas itu.
// Data Firebase (butuh Rules, lihat RULES-SIAP-TEMPEL-fix40.txt):
//   honor_kebersihan_v4/petugas/<id>                  = { nama, tarif (Rp/hari), aktif, bayarLibur, dibuat }
//   honor_kebersihan_v4/hadir/<YYYY-MM>/<id>/<tanggal> = true
// Dimuat SESUDAH js/honor-guru.js (memakai adminSesi, honorModal, honorPesanGagalTulis, tanggalLiburKalender).
// Hari kerja per pekan diatur di HK_HARI_KERJA (0=Minggu ... 6=Sabtu); bawaan Senin-Sabtu.
// ============================================================

const HK_HARI_KERJA = [1, 2, 3, 4, 5, 6];
const HK_NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HK_NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let hkPetugas = null;        // { id: { nama, tarif, aktif, bayarLibur } } | null = belum dimuat
let hkHadirCache = {};       // 'YYYY-MM' -> { id: { 'YYYY-MM-DD': true } }
let hkDraft = {};            // 'YYYY-MM|id' -> Set tanggal (perubahan yang belum disimpan)
let hkStatus = 'belum';      // 'belum' | 'ok' | 'gagal'
let hkGalat = '';
let hkYm = '';               // bulan yang sedang ditampilkan ('YYYY-MM')
let hkSibuk = false;
let _hkKalenderDicoba = false;

function hkRp(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }
function hkPad(n) { return String(n).padStart(2, '0'); }
function hkTglPendek(daftar) { return daftar.map(t => parseInt(t.slice(8), 10)).join(', '); }
function hkBisaUbah() { return typeof isAdmin === 'function' && isAdmin(); }

// Semua hari pada bulan ym beserta status liburnya. libur = '' (hari efektif) atau teks alasan libur.
function hkHariBulan(ym) {
  const p = ym.split('-'), y = parseInt(p[0], 10), m = parseInt(p[1], 10);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const liburKal = (typeof tanggalLiburKalender === 'function') ? tanggalLiburKalender() : new Set();
  const out = [];
  for (let d = 1; d <= n; d++) {
    const tgl = ym + '-' + hkPad(d), dow = new Date(tgl + 'T00:00:00Z').getUTCDay();
    let libur = '';
    if (liburKal.has(tgl)) libur = 'Libur Kalender Akademik';
    else if (!HK_HARI_KERJA.includes(dow)) libur = 'Hari ' + HK_NAMA_HARI[dow] + ' (bukan hari kerja)';
    out.push({ tgl, d, dow, libur });
  }
  return out;
}

// Ringkasan satu petugas pada bulan ym (memakai draft bila ada perubahan yang belum disimpan).
function hkHitung(p, id, ym, hari, abaikanDraft) {
  const tersimpan = (hkHadirCache[ym] || {})[id] || {};
  const dk = abaikanDraft ? null : hkDraft[ym + '|' + id];   // abaikanDraft = rekap untuk PDF/Kas: hanya data yang SUDAH tersimpan
  const set = dk || new Set(Object.keys(tersimpan));
  const hariIni = (typeof tglLokal === 'function') ? tglLokal() : '';
  let efektif = 0, hadirEf = 0, hadirLibur = 0;
  const tidakHadir = [], hadirLiburTgl = [];
  hari.forEach(h => {
    if (!h.libur) {
      efektif++;
      if (set.has(h.tgl)) hadirEf++;
      else if (!hariIni || h.tgl <= hariIni) tidakHadir.push(h.tgl);   // hari yang belum tiba bukan "tidak hadir"
    } else if (set.has(h.tgl)) { hadirLibur++; hadirLiburTgl.push(h.tgl); }
  });
  const tarif = Number(p.tarif) || 0;
  const dibayar = hadirEf + (p.bayarLibur ? hadirLibur : 0);
  return { set, efektif, hadirEf, hadirLibur, tidakHadir, hadirLiburTgl, tarif, dibayar, honor: dibayar * tarif, draft: !!dk };
}

function hkSinkronBulan(paksa) {
  const b = document.getElementById('hkBulan'), t = document.getElementById('hkTahun');
  if (paksa || !hkYm) {   // paksa = tab dibuka: ikuti Bulan/Tahun yang dipilih di Rekap Honor
    const m = (document.getElementById('honorMonth') || {}).value, y = (document.getElementById('honorYear') || {}).value;
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    hkYm = (parseInt(y, 10) || now.getUTCFullYear()) + '-' + hkPad(parseInt(m, 10) || (now.getUTCMonth() + 1));
  }
  if (b) b.value = String(parseInt(hkYm.slice(5), 10));
  if (t) t.value = hkYm.slice(0, 4);
}
function hkGantiBulan() {
  const m = parseInt((document.getElementById('hkBulan') || {}).value, 10), y = parseInt((document.getElementById('hkTahun') || {}).value, 10);
  if (!(m >= 1 && m <= 12) || !(y >= 2000 && y <= 2100)) return;
  hkYm = y + '-' + hkPad(m);
  // Samakan juga pemilih Bulan/Tahun di Rekap Honor, lalu hitung ulang rekap setelah data bulan ini termuat.
  const hm = document.getElementById('honorMonth'), hy = document.getElementById('honorYear');
  if (hm) hm.value = String(m);
  if (hy) hy.value = String(y);
  renderHonorKebersihan(false, hkSegarkanRekapHonor);
}

// Dipanggil honorMenuTab('kebersihan'): muat Kalender Akademik (lazy) + data, lalu gambar.
function renderHonorKebersihan(ikutiRekap, sesudah) {
  const box = document.getElementById('hkIsi'); if (!box) return;
  if (!_hkKalenderDicoba && typeof lazyLoadedSet !== 'undefined' && !lazyLoadedSet.has('kalenderAkademik') && typeof ensureLazyDatasets === 'function') {
    _hkKalenderDicoba = true;
    ensureLazyDatasets(['kalenderAkademik'], () => renderHonorKebersihan(ikutiRekap, sesudah));
    return;
  }
  hkSinkronBulan(!!ikutiRekap);
  box.innerHTML = '<p class="text-muted" style="font-size:13px;">⏳ Memuat data petugas kebersihan…</p>';
  hkMuat(hkYm, () => { hkGambar(); if (typeof sesudah === 'function') sesudah(); });
}

function hkMuat(ym, selesai) {
  if (typeof db === 'undefined' || !db || !navigator.onLine) { hkStatus = 'gagal'; hkGalat = 'Butuh koneksi internet untuk membuka data petugas kebersihan.'; return selesai(); }
  const tugas = [];
  if (hkPetugas === null) tugas.push(db.ref('honor_kebersihan_v4/petugas').once('value').then(s => { hkPetugas = s.val() || {}; }));
  if (!hkHadirCache[ym]) tugas.push(db.ref('honor_kebersihan_v4/hadir/' + ym).once('value').then(s => { hkHadirCache[ym] = s.val() || {}; }));
  Promise.all(tugas).then(() => { hkStatus = 'ok'; selesai(); }).catch(err => {
    hkStatus = 'gagal';
    hkGalat = /permission/i.test((err && err.message) || '') ? 'Akses baca ditolak oleh Rules Firebase (honor_kebersihan_v4). Pasang Rules dari RULES-SIAP-TEMPEL-fix40.txt.' : ((err && err.message) || String(err));
    selesai();
  });
}

function hkGambar() {
  const box = document.getElementById('hkIsi'); if (!box) return;
  if (hkStatus !== 'ok' || hkPetugas === null) {
    box.innerHTML = '<p style="color:#b91c1c;font-size:13px;">❌ ' + escapeHtml(hkGalat || 'Data belum termuat.') + '</p><button class="btn btn-soft" onclick="hkRekapReset();renderHonorKebersihan()">🔄 Coba lagi</button>';
    return;
  }
  const ym = hkYm, hari = hkHariBulan(ym), bisa = hkBisaUbah();
  const kalenderAda = (typeof allKalenderAkademik !== 'undefined') && allKalenderAkademik && (Array.isArray(allKalenderAkademik) ? allKalenderAkademik.length : Object.keys(allKalenderAkademik).length);
  const liburBulan = hari.filter(h => h.libur);
  const hadirBulan = hkHadirCache[ym] || {};
  const daftar = Object.keys(hkPetugas).map(id => ({ id, p: hkPetugas[id] || {} }))
    .filter(x => x.p.aktif !== false || Object.keys(hadirBulan[x.id] || {}).length > 0 || hkDraft[ym + '|' + x.id])
    .sort((a, b) => String(a.p.nama || '').localeCompare(String(b.p.nama || ''), 'id'));

  let html = '';
  // ---- keterangan hari libur bulan ini ----
  const liburKalTgl = liburBulan.filter(h => h.libur === 'Libur Kalender Akademik').map(h => h.tgl);
  html += '<div style="font-size:12px;color:#6b7280;background:#f9fafb;border-radius:10px;padding:10px 12px;margin-bottom:12px;">'
    + '📅 <strong>' + HK_NAMA_BULAN[parseInt(ym.slice(5), 10) - 1] + ' ' + ym.slice(0, 4) + '</strong>: ' + hari.filter(h => !h.libur).length + ' hari efektif, ' + liburBulan.length + ' hari libur'
    + (liburKalTgl.length ? ' (libur Kalender Akademik tgl ' + hkTglPendek(liburKalTgl) + ')' : '') + '.'
    + (kalenderAda ? '' : ' <span style="color:#b45309;">⚠️ Kalender Akademik belum terbaca/kosong, jadi hanya hari bukan-hari-kerja yang dianggap libur.</span>')
    + '</div>';

  if (daftar.length === 0) html += '<p class="text-muted" style="font-size:13px;">Belum ada petugas kebersihan.' + (bisa ? ' Tambahkan di bagian bawah.' : '') + '</p>';

  const baris = [];
  daftar.forEach(({ id, p }) => {
    const r = hkHitung(p, id, ym, hari);
    baris.push({ id, p, r });
    const nonaktif = p.aktif === false;
    // kalender: Senin di kolom pertama
    const offset = (hari[0].dow + 6) % 7;
    let grid = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(x => '<div style="text-align:center;font-size:10px;color:#9ca3af;">' + x + '</div>').join('');
    for (let i = 0; i < offset; i++) grid += '<div></div>';
    hari.forEach(h => {
      const hadir = r.set.has(h.tgl);
      let st = 'border:1px solid #e5e7eb;background:#fff;color:#374151;', tanda = '';
      if (hadir && !h.libur) { st = 'border:1px solid #16a34a;background:#dcfce7;color:#166534;'; tanda = '✓'; }
      else if (hadir && h.libur) { st = 'border:1px solid #ea580c;background:#ffedd5;color:#9a3412;'; tanda = '✓'; }
      else if (h.libur) { st = 'border:1px solid #e5e7eb;background:#f3f4f6;color:#9ca3af;'; }
      const isi = '<span style="font-size:13px;font-weight:600;">' + h.d + '</span><span style="font-size:10px;display:block;line-height:10px;min-height:10px;">' + tanda + '</span>';
      const dasar = 'padding:4px 0;border-radius:8px;text-align:center;' + st;
      grid += (bisa && !nonaktif)
        ? '<button type="button" title="' + escapeHtml(h.libur || 'Hari efektif') + '" onclick="hkToggle(\'' + id + '\',\'' + h.tgl + '\')" style="cursor:pointer;min-height:0;' + dasar + '">' + isi + '</button>'
        : '<div title="' + escapeHtml(h.libur || 'Hari efektif') + '" style="' + dasar + '">' + isi + '</div>';
    });
    html += '<div style="border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-bottom:12px;' + (nonaktif ? 'opacity:.7;' : '') + '">'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">'
      + '<div><strong style="font-size:15px;">🧹 ' + escapeHtml(p.nama || '(tanpa nama)') + '</strong>' + (nonaktif ? ' <span style="font-size:11px;color:#6b7280;">(nonaktif)</span>' : '')
      + '<div style="font-size:12px;color:#6b7280;">' + hkRp(r.tarif) + ' / hari</div></div>'
      + (bisa ? '<div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="btn btn-soft" style="min-height:0;padding:6px 10px;font-size:12px;" onclick="hkUbah(\'' + id + '\')">✏️ Ubah</button>'
        + '<button type="button" class="btn btn-soft" style="min-height:0;padding:6px 10px;font-size:12px;" onclick="hkAktif(\'' + id + '\',' + (nonaktif ? 'true' : 'false') + ')">' + (nonaktif ? '✅ Aktifkan' : '🚫 Nonaktifkan') + '</button></div>' : '')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px;max-width:420px;">' + grid + '</div>'
      + '<div style="font-size:12px;margin-top:10px;line-height:1.7;">'
      + 'Hari efektif <strong>' + r.efektif + '</strong> · Hadir <strong style="color:#166534;">' + r.hadirEf + '</strong> · Tidak hadir <strong style="color:' + (r.tidakHadir.length ? '#b91c1c' : '#6b7280') + ';">' + r.tidakHadir.length + '</strong>'
      + (r.tidakHadir.length ? ' <span style="color:#6b7280;">(tgl ' + hkTglPendek(r.tidakHadir) + ')</span>' : '')
      + (r.hadirLibur ? '<br><span style="color:#9a3412;">⚠️ Hadir di hari libur: <strong>' + r.hadirLibur + '</strong> (tgl ' + hkTglPendek(r.hadirLiburTgl) + ') — ' + (p.bayarLibur ? 'ikut dibayar' : 'tidak dibayar') + '</span>' : '')
      + '<br>Honor: <strong style="font-size:14px;">' + hkRp(r.honor) + '</strong> <span style="color:#6b7280;">(' + r.dibayar + ' hari × ' + hkRp(r.tarif) + ')</span>'
      + '</div>'
      + (bisa && !nonaktif ? '<label style="display:flex;gap:6px;align-items:center;font-size:12px;margin-top:6px;"><input type="checkbox" ' + (p.bayarLibur ? 'checked ' : '') + 'onchange="hkBayarLibur(\'' + id + '\',this.checked)"> Hari libur ikut dibayar</label>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;"><button type="button" class="btn btn-soft" style="min-height:0;padding:6px 10px;font-size:12px;" onclick="hkIsiSemua(\'' + id + '\')">✔ Semua hari efektif</button>'
        + '<button type="button" class="btn btn-soft" style="min-height:0;padding:6px 10px;font-size:12px;" onclick="hkKosongkan(\'' + id + '\')">✖ Kosongkan</button></div>' : '')
      + (r.draft && bisa ? '<div style="margin-top:8px;padding:8px 10px;background:#fef3c7;border-radius:10px;font-size:12px;color:#92400e;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;">⚠️ Perubahan belum disimpan'
        + '<span style="display:flex;gap:6px;"><button type="button" class="btn btn-success" style="min-height:0;padding:6px 12px;font-size:12px;" onclick="hkSimpan(\'' + id + '\')">💾 Simpan</button><button type="button" class="btn btn-soft" style="min-height:0;padding:6px 12px;font-size:12px;" onclick="hkBatal(\'' + id + '\')">Batal</button></span></div>' : '')
      + '</div>';
  });

  // ---- rekap semua petugas ----
  if (baris.length) {
    let totalHonor = 0;
    let tb = '<div style="overflow-x:auto;"><table style="font-size:12px;"><thead><tr><th>Nama</th><th>Hari efektif</th><th>Hadir</th><th>Tidak hadir</th><th>Hadir di libur</th><th>Tarif/hari</th><th>Honor</th></tr></thead><tbody>';
    baris.forEach(({ p, r }) => {
      totalHonor += r.honor;
      tb += '<tr><td>' + escapeHtml(p.nama || '') + '</td><td>' + r.efektif + '</td><td>' + r.hadirEf + '</td><td>' + r.tidakHadir.length + '</td><td>' + r.hadirLibur + (r.hadirLibur ? (p.bayarLibur ? ' (dibayar)' : ' (tidak dibayar)') : '') + '</td><td>' + hkRp(r.tarif) + '</td><td>' + hkRp(r.honor) + '</td></tr>';
    });
    tb += '<tr style="font-weight:700;background:#f9fafb;"><td colspan="6">Total honor petugas kebersihan</td><td>' + hkRp(totalHonor) + '</td></tr></tbody></table></div>';
    const adaDraft = baris.some(b => b.r.draft);
    html += '<h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">📋 Rekap ' + HK_NAMA_BULAN[parseInt(ym.slice(5), 10) - 1] + ' ' + ym.slice(0, 4) + '</h4>' + tb
      + (adaDraft ? '<p style="font-size:11px;color:#92400e;margin-top:6px;">⚠️ Ada perubahan yang belum disimpan; angka di atas sudah memakainya.</p>' : '')
      + '<div style="margin-top:10px;"><button class="btn btn-soft" onclick="hkUnduhCsv()">📥 Unduh CSV (Excel)</button></div>';
  }

  // ---- tambah petugas ----
  if (bisa) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">'
      + '<input id="hkNamaBaru" class="field" style="flex:2;min-width:160px;" placeholder="Nama petugas kebersihan" maxlength="100">'
      + '<input id="hkTarifBaru" type="number" class="field" style="flex:1;min-width:120px;" placeholder="Tarif Rp/hari" min="0" step="1000">'
      + '<button class="btn btn-success" onclick="hkTambahPetugas()">➕ Tambah</button></div>';
  }
  box.innerHTML = html;
}

// ---------- ubah centang (hanya di draft sampai Simpan) ----------
function hkDraftAwal(id) {
  const k = hkYm + '|' + id;
  return hkDraft[k] || new Set(Object.keys((hkHadirCache[hkYm] || {})[id] || {}));
}
function hkToggle(id, tgl) {
  if (!hkBisaUbah()) return;
  const set = hkDraftAwal(id);
  if (set.has(tgl)) set.delete(tgl); else set.add(tgl);
  hkDraft[hkYm + '|' + id] = set;
  hkGambar();
}
function hkIsiSemua(id) {
  if (!hkBisaUbah()) return;
  const set = hkDraftAwal(id);
  hkHariBulan(hkYm).forEach(h => { if (!h.libur) set.add(h.tgl); });
  hkDraft[hkYm + '|' + id] = set;
  hkGambar();
}
function hkKosongkan(id) {
  if (!hkBisaUbah()) return;
  hkDraft[hkYm + '|' + id] = new Set();
  hkGambar();
}
function hkBatal(id) { delete hkDraft[hkYm + '|' + id]; hkGambar(); }

function hkAdminSesi() { return (typeof adminSesi === 'function') ? adminSesi() : Promise.resolve(true); }
function hkGagal(err, aksi) { toast((typeof honorPesanGagalTulis === 'function') ? honorPesanGagalTulis(err, aksi) : (aksi + ': ' + ((err && err.message) || err)), true, 7000); }

function hkSimpan(id) {
  if (!hkBisaUbah()) return toast('Hanya Admin!', true);
  const ym = hkYm, key = ym + '|' + id, draft = hkDraft[ym + '|' + id];
  if (!draft || hkSibuk) return;
  const valid = new Set(hkHariBulan(ym).map(h => h.tgl)), obj = {};
  draft.forEach(t => { if (valid.has(t)) obj[t] = true; });
  const lama = (hkHadirCache[ym] || {})[id] || null, ref = db.ref('honor_kebersihan_v4/hadir/' + ym + '/' + id), ada = Object.keys(obj).length > 0;
  hkSibuk = true;
  hkAdminSesi().then(() => ada ? ref.set(obj) : ref.remove()).then(() => {
    hkSibuk = false;
    if (!hkHadirCache[ym]) hkHadirCache[ym] = {};
    if (ada) hkHadirCache[ym][id] = obj; else delete hkHadirCache[ym][id];
    delete hkDraft[key];
    try { if (typeof v4Audit === 'function') v4Audit('HONOR_KEBERSIHAN', 'HONOR_KEBERSIHAN', id + '|' + ym, lama, ada ? obj : null); } catch (e) { /* audit opsional */ }
    toast('✅ Kehadiran petugas kebersihan tersimpan.');
    if (hkYm === ym) hkGambar();
    hkSegarkanRekapHonor();
  }).catch(err => { hkSibuk = false; hkGagal(err, 'Gagal menyimpan'); });
}

// ---------- kelola petugas ----------
function hkTulisPetugas(id, patch, pesanOk) {
  if (!hkBisaUbah()) return toast('Hanya Admin!', true);
  hkAdminSesi().then(() => db.ref('honor_kebersihan_v4/petugas/' + id).update(patch)).then(() => {
    hkPetugas[id] = Object.assign({}, hkPetugas[id] || {}, patch);
    if (pesanOk) toast(pesanOk);
    hkGambar();
    hkSegarkanRekapHonor();
  }).catch(err => { hkGagal(err, 'Gagal menyimpan'); hkGambar(); });
}
function hkTambahPetugas() {
  if (!hkBisaUbah()) return toast('Hanya Admin!', true);
  const nama = String((document.getElementById('hkNamaBaru') || {}).value || '').trim().replace(/\s+/g, ' ');
  const tarif = Number((document.getElementById('hkTarifBaru') || {}).value);
  if (!nama) return toast('⚠️ Isi nama petugas.', true);
  if (!(tarif >= 0) || (document.getElementById('hkTarifBaru') || {}).value === '') return toast('⚠️ Isi tarif per hari (boleh 0 bila belum ditetapkan).', true);
  if (hkSibuk) return;
  const ref = db.ref('honor_kebersihan_v4/petugas').push(), data = { nama, tarif: Math.round(tarif), aktif: true, bayarLibur: false, dibuat: new Date().toISOString() };
  hkSibuk = true;
  hkAdminSesi().then(() => ref.set(data)).then(() => {
    hkSibuk = false; hkPetugas[ref.key] = data;
    toast('✅ Petugas ditambahkan.'); hkGambar(); hkSegarkanRekapHonor();
  }).catch(err => { hkSibuk = false; hkGagal(err, 'Gagal menambah petugas'); });
}
function hkUbah(id) {
  const p = (hkPetugas || {})[id]; if (!p || !hkBisaUbah() || typeof honorModal !== 'function') return;
  honorModal({
    judul: '✏️ Ubah petugas kebersihan',
    isiHtml: '<label class="label">Nama</label><input id="hkEditNama" class="field" maxlength="100" value="' + escapeHtml(p.nama || '') + '">'
      + '<label class="label" style="margin-top:8px;">Tarif per hari (Rp)</label><input id="hkEditTarif" type="number" class="field" min="0" step="1000" value="' + (Number(p.tarif) || 0) + '">'
      + '<p style="font-size:11px;color:#6b7280;margin-top:6px;">Tarif baru berlaku untuk SEMUA bulan (rekap dihitung ulang memakai tarif saat ini).</p>',
    okLabel: 'Simpan',
    ambil: ov => {
      const nama = String(ov.querySelector('#hkEditNama').value || '').trim().replace(/\s+/g, ' '), tarif = Number(ov.querySelector('#hkEditTarif').value);
      if (!nama) return { galat: 'Nama tidak boleh kosong.' };
      if (!(tarif >= 0) || ov.querySelector('#hkEditTarif').value === '') return { galat: 'Tarif harus berupa angka 0 atau lebih.' };
      return { nilai: { nama, tarif: Math.round(tarif) } };
    }
  }).then(v => { if (v) hkTulisPetugas(id, v, '✅ Data petugas diperbarui.'); });
}
function hkAktif(id, aktif) {
  const p = (hkPetugas || {})[id]; if (!p) return;
  if (!aktif && !confirm('Nonaktifkan ' + (p.nama || 'petugas ini') + '? Riwayat kehadiran tetap tersimpan; ia hanya tidak muncul di bulan yang tidak ada datanya.')) return;
  hkTulisPetugas(id, { aktif: !!aktif }, aktif ? '✅ Petugas diaktifkan.' : '✅ Petugas dinonaktifkan.');
}
function hkBayarLibur(id, cek) { hkTulisPetugas(id, { bayarLibur: !!cek }, null); }

// ---------- unduh CSV ----------
function hkUnduhCsv() {
  if (hkStatus !== 'ok' || !hkPetugas) return;
  const ym = hkYm, hari = hkHariBulan(ym), q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const rows = [['Nama', 'Hari efektif', 'Hadir', 'Tidak hadir', 'Hadir di hari libur', 'Libur dibayar', 'Tarif per hari', 'Hari dibayar', 'Honor', 'Tanggal hadir']];
  Object.keys(hkPetugas).map(id => ({ id, p: hkPetugas[id] || {} })).sort((a, b) => String(a.p.nama || '').localeCompare(String(b.p.nama || ''), 'id')).forEach(({ id, p }) => {
    const r = hkHitung(p, id, ym, hari);
    if (p.aktif === false && !r.set.size) return;
    rows.push([p.nama || '', r.efektif, r.hadirEf, r.tidakHadir.length, r.hadirLibur, p.bayarLibur ? 'Ya' : 'Tidak', r.tarif, r.dibayar, r.honor, [...r.set].sort().map(t => parseInt(t.slice(8), 10)).join(' ')]);
  });
  const csv = '\ufeff' + rows.map(r => r.map(q).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'honor-kebersihan-' + ym + '.csv'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------- Rekap SIAP-PAKAI untuk Rekap Honor Guru (layar Kas, PDF gabungan, catatan Kas Umum) ----------
// Hanya data TERSIMPAN (draft centang yang belum disimpan tidak ikut). Mengembalikan:
//   { siap:false }                                   -> masih memuat (onReady dipanggil saat selesai)
//   { siap:true, gagal:true, pesan, total:0, baris:[] } -> tidak bisa dimuat (offline / Rules belum dipasang); pemanggil WAJIB memberi tahu pengguna
//   { siap:true, gagal:false, total, baris:[{id,nama,efektif,hadirEf,tidakHadir,hadirLibur,bayarLibur,tarif,dibayar,honor}], kalenderAda }
let _hkRekapMenunggu = {};   // ym -> true selama dimuat (satu pemuatan saja)
let _hkRekapGagal = {};      // ym -> pesan galat; mencegah muat ulang tanpa henti saat gagal (hkRekapReset untuk mencoba lagi)
function hkRekapReset() { _hkRekapGagal = {}; _hkRekapMenunggu = {}; hkPetugas = null; hkHadirCache = {}; }
function hkRekapBulan(ym, onReady) {
  if (_hkRekapGagal[ym]) return { siap: true, gagal: true, pesan: _hkRekapGagal[ym], total: 0, baris: [] };
  if (typeof db === 'undefined' || !db || !navigator.onLine) return { siap: true, gagal: true, pesan: 'Sedang offline — honor petugas kebersihan tidak dapat dimuat.', total: 0, baris: [] };
  // Hari libur Kalender Akademik harus sudah termuat agar hari efektif sama dengan yang tampil di tab Petugas Kebersihan.
  if (!_hkKalenderDicoba && typeof lazyLoadedSet !== 'undefined' && !lazyLoadedSet.has('kalenderAkademik') && typeof ensureLazyDatasets === 'function') {
    _hkKalenderDicoba = true;
    ensureLazyDatasets(['kalenderAkademik'], () => { if (onReady) onReady(); });
    return { siap: false };
  }
  if (hkPetugas === null || !hkHadirCache[ym]) {
    if (_hkRekapMenunggu[ym]) return { siap: false };
    _hkRekapMenunggu[ym] = true;
    hkMuat(ym, () => {
      delete _hkRekapMenunggu[ym];
      if (hkStatus !== 'ok' || hkPetugas === null || !hkHadirCache[ym]) _hkRekapGagal[ym] = hkGalat || 'Data petugas kebersihan tidak dapat dimuat.';
      if (onReady) onReady();
    });
    return { siap: false };
  }
  const hari = hkHariBulan(ym), hadirBulan = hkHadirCache[ym] || {}, baris = [];
  let total = 0;
  Object.keys(hkPetugas).map(id => ({ id, p: hkPetugas[id] || {} }))
    .filter(x => x.p.aktif !== false || Object.keys(hadirBulan[x.id] || {}).length > 0)
    .sort((a, b) => String(a.p.nama || '').localeCompare(String(b.p.nama || ''), 'id'))
    .forEach(({ id, p }) => {
      const r = hkHitung(p, id, ym, hari, true);
      baris.push({ id, nama: p.nama || '(tanpa nama)', efektif: r.efektif, hadirEf: r.hadirEf, tidakHadir: r.tidakHadir.length, hadirLibur: r.hadirLibur, bayarLibur: !!p.bayarLibur, tarif: r.tarif, dibayar: r.dibayar, honor: r.honor });
      total += r.honor;
    });
  const kalenderAda = (typeof allKalenderAkademik !== 'undefined') && allKalenderAkademik && (Array.isArray(allKalenderAkademik) ? allKalenderAkademik.length : Object.keys(allKalenderAkademik).length);
  return { siap: true, gagal: false, total, baris, kalenderAda: !!kalenderAda };
}
// HTML bagian "Honor Petugas Kebersihan" untuk tab Rekap Honor (terlihat oleh semua peran yang melihat rekap, bukan hanya Admin).
// kbr = hasil hkRekapBulan(); ym = 'YYYY-MM'; totalGuru = total honor guru bulan itu.
function hkRekapHtml(kbr, ym, totalGuru) {
  const bln = HK_NAMA_BULAN[parseInt(ym.slice(5), 10) - 1] + ' ' + ym.slice(0, 4);
  const judul = '<h4 style="font-size:14px;font-weight:700;margin:18px 0 8px;">🧹 Honor Petugas Kebersihan — ' + escapeHtml(bln) + '</h4>';
  const kotak = (bg, warna, isi) => '<div style="padding:10px 12px;background:' + bg + ';border-radius:10px;font-size:12px;color:' + warna + ';">' + isi + '</div>';
  const muat = ' <button type="button" class="btn btn-soft" style="min-height:0;padding:4px 10px;font-size:12px;" onclick="hkRekapReset();renderHonor()">🔄 Muat ulang</button>';
  if (!kbr || !kbr.siap) return judul + kotak('#f3f4f6', '#6b7280', '⏳ Memuat honor petugas kebersihan…');
  if (kbr.gagal) return judul + kotak('#fef3c7', '#92400e', '⚠️ Honor petugas kebersihan TIDAK termuat (' + escapeHtml(kbr.pesan || 'galat') + '), jadi belum ikut di rekap ini.' + muat);
  if (!kbr.baris.length) return judul + kotak('#f9fafb', '#6b7280', 'Belum ada kehadiran petugas kebersihan yang tersimpan untuk bulan ini. Isi di tab <b>🧹 Petugas Kebersihan</b> lalu tekan <b>Simpan</b> (centang yang belum disimpan tidak dihitung).' + muat);
  let tb = '<div style="overflow-x:auto;"><table class="honor-rekap-tbl"><thead><tr><th>No</th><th>Petugas</th><th>Hari efektif</th><th>Hadir</th><th>Tidak hadir</th><th>Hadir di libur</th><th>Tarif/hari</th><th>Hari dibayar</th><th>Honor</th></tr></thead><tbody>';
  kbr.baris.forEach((b, i) => {
    tb += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(b.nama) + '</td><td>' + b.efektif + '</td><td>' + b.hadirEf + '</td><td>' + b.tidakHadir + '</td><td>'
      + (b.hadirLibur ? b.hadirLibur + (b.bayarLibur ? ' (dibayar)' : ' (tidak dibayar)') : '-') + '</td><td>' + hkRp(b.tarif) + '</td><td>' + b.dibayar + '</td><td>' + hkRp(b.honor) + '</td></tr>';
  });
  tb += '</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="8" style="text-align:right;">TOTAL PETUGAS KEBERSIHAN</th><th style="color:#059669;">' + hkRp(kbr.total) + '</th></tr></tfoot></table></div>';
  const gab = '<div style="margin-top:10px;font-size:13px;">Honor guru <b>' + hkRp(totalGuru) + '</b> + petugas kebersihan <b>' + hkRp(kbr.total) + '</b> = <b style="color:#059669;">' + hkRp((Number(totalGuru) || 0) + kbr.total) + '</b>'
    + ' <span style="color:#6b7280;font-size:12px;">(sebelum dikurangi panjar)</span>' + muat + '</div>';
  const kal = kbr.kalenderAda ? '' : '<div style="margin-top:8px;">' + kotak('#fef3c7', '#92400e', '⚠️ Kalender Akademik belum terbaca/kosong, jadi hari libur kalender tidak dikecualikan pada honor petugas kebersihan.') + '</div>';
  return judul + tb + gab + kal;
}
// Setelah data kebersihan berubah, Rekap Honor Guru (total gabungan, Kas, PDF) ikut dihitung ulang bila halamannya sudah pernah dibuka.
function hkSegarkanRekapHonor() { try { if (typeof renderHonor === 'function' && window._honorData) renderHonor(); } catch (e) { console.warn('[SI MAMBA] segarkan rekap honor:', e); } }
