/* ============================================================
   SI MAMBA - js/amalan-kegiatan.js
   Menu "Amalan Yaumiyah" (halaman activities-v4): jenis kegiatan
   (Sholat Dhuha, Dzuhur, dst.), penanggung jawab (PJ), pengganti PJ
   harian, absensi siswa, dan rekap absensi sholat siswa.

   Dimuat SETELAH js/app.js (pakai <script src="js/amalan-kegiatan.js">
   tepat di bawah script app.js). Memakai fungsi/variabel global dari app.js:
   V4, db, currentUser, allGuru, allSiswa, KELAS_LIST, COLLATOR_ID, toast,
   isBusy/setBusy/clearBusy, escapeHtml/escapeJs, v4Safe, v4Date, tglLokal,
   v4IsAdmin/v4IsHead/v4CanAdmin, v4LoadCore, v4CacheCore, v4Audit,
   v4FetchSiswaByKelas, v4PanelSiswaCache, v4PanelSiswaMemuatHtml,
   v4CariJenisKegiatanSholat, v4KataKunciSholat, v4HariDiizinkanSholat,
   siswaScopeKelas, namaFileAman, ensureLib, currentTahunAjaran, addLog,
   v4HitungJarakMeter (dipakai v4ActCekLokasi), jsQR, QRCode (pustaka scan/cetak QR).

   Dipanggil dari app.js: v4RenderActivities() (v4RenderAllCore & navigateTo)
   dan amalanKegiatanResetState() (logout).

   v2: check-in petugas harian lewat QR + klaim pengganti (lihat bagian "CHECK-IN PETUGAS" di bawah).
   Butuh node Firebase baru activity_checkin_v4 dan field activity_types_v4/<key>/{qrToken,jamMulai}.

   v3: KELAS YANG TIDAK IKUT suatu kegiatan (mis. kelas 1 & 2 pulang lebih awal sehingga tidak ikut Sholat Dzuhur).
   Field baru activity_types_v4/<key>/kelasTidakIkut (string, kelas dipisah '|', mis. "1|2"); diatur Admin lewat tombol
   "Kelas Peserta" di kartu kegiatan. Kelas itu dikeluarkan dari "Semua Kelas", dari syarat kelengkapan absensi (honor sholat
   guru) dan dari penilaian Kepatuhan PJ. Helper yang bisa dipakai file lain: v4ActKelasAktif(type), v4ActKelasTidakIkut(typeKey, kelas).
============================================================ */

// ---------- State modul ----------
let v4ActOpenTypeKey = null;
let v4ActDateSel = {};         // typeKey -> tanggal aktif
let v4ActKelasSel = {};        // typeKey -> kelas aktif
let v4ActAttendanceDraft = {}; // typeKey -> { studentKey -> {status} }  (dikunci per kegiatan agar tidak bocor antar panel)
function v4ActDraftOf(typeKey) { return v4ActAttendanceDraft[typeKey] || {}; }            // baca (tidak membuat entri)
function v4ActDraftW(typeKey) { return v4ActAttendanceDraft[typeKey] || (v4ActAttendanceDraft[typeKey] = {}); } // tulis
// Buang wadah draft yang sudah kosong (mis. setelah simpan menghapus semua entrinya) supaya state tidak menumpuk sisa.
function v4ActDraftPrune(typeKey) { const d = v4ActAttendanceDraft[typeKey]; if (d && Object.keys(d).length === 0) delete v4ActAttendanceDraft[typeKey]; }
let v4ActFastMode = {};        // typeKey -> false = Mode Tabel; selain itu (default) = Mode Cepat (ketuk nama untuk ganti status)
let v4SubstituteFormOpenFor = null;
let v4ActKelasFormOpen = null;   // typeKey yang form "Kelas Peserta"-nya sedang terbuka
let v4RekapReligiLast = null;  // tabel rekap yang sedang tampil -- dipakai tombol ekspor
// Filter Rekap Absensi Sholat Siswa -- terpisah dari state pengisian harian.
let v4RekapReligiState = { kelas: '', bulan: null, tahun: null, view: 'kelas', petugasMode: 'detail', alpaMin: 3 };
let v4RekapPetugasCache = {};   // 'YYYY-MM' -> { status:'loading'|'ok'|'gagal', data, at } (check-in petugas QR sebulan)

// Dipanggil dari logout() di app.js supaya state akun lama tidak bocor ke akun berikutnya.
function amalanKegiatanResetState() {
  v4ActOpenTypeKey = null; v4ActAttendanceDraft = {}; v4ActDateSel = {}; v4ActKelasSel = {}; v4ActFastMode = {};
  v4SubstituteFormOpenFor = null; v4ActKelasFormOpen = null; v4RekapReligiLast = null;
  v4RekapReligiState = { kelas: '', bulan: null, tahun: null, view: 'kelas', petugasMode: 'detail', alpaMin: 3 };
  v4RekapPetugasCache = {};
  v4HonorSholatCache = {}; v4HonorSiswaCache = {};
  v4ActBersihkanCheckin();
}

// ---------- Helper kecil ----------
function v4ActTypeByKey(key) { return (V4.activityTypes || []).find(t => t.key === key); }
function v4ActPersistCache() { try { if (typeof v4CacheCore === 'function') v4CacheCore(); } catch (e) { console.warn('[SI MAMBA] cache kegiatan:', e); } }
// Tulis ke Firebase saat offline menggantung selamanya (kunci busy tak pernah lepas) -> tolak di depan.
function v4ActButuhOnline(pesan) {
  if (navigator.onLine) return true;
  toast('📡 Sedang offline. ' + (pesan || 'Perubahan ini butuh koneksi internet.'), true);
  return false;
}
function v4ActGagal(err) {
  console.error('[SI MAMBA] Gagal simpan:', err);
  toast('❌ Gagal menyimpan: ' + (err && err.message || err), true);
}
// Log aktivitas itu sekunder: kegagalannya tidak boleh membuat operasi yang SUDAH tersimpan di server dilaporkan gagal.
function v4ActLogAman(aksi, detail) {
  try { addLog(aksi, detail); } catch (e) { console.warn('[SI MAMBA] Gagal mencatat log:', e); }
}
// Apakah rujukan (refKey, refName) -- picKey/picName atau guruKey/guruName tersimpan -- menunjuk guru (gKey, gNama)?
// Identitas guru = key, atau nama bila guru tidak punya key (lihat g.key || g.name di dropdown). Nama hanya FALLBACK:
// kalau rujukan jelas berisi key milik guru LAIN, kesamaan nama tidak boleh memberi hak PJ/pengganti.
function v4ActSamaGuru(refKey, refName, gKey, gNama) {
  const rk = (refKey && refKey !== '-') ? String(refKey) : '';
  const gid = gKey || gNama || '';
  if (rk && gid && rk === gid) return true;
  if (rk && (allGuru || []).some(x => x && x.key && x.key === rk)) return false; // rk = key guru lain
  return !!(refName && gNama && refName === gNama);
}
function v4ActAkuCocok(refKey, refName) { return !!currentUser && v4ActSamaGuru(refKey, refName, currentUser.key, currentUser.name); }
// 'sholat_dluha' | 'sholat_dzuhur' | null -- dicocokkan lewat nama (sama seperti v4CariJenisKegiatanSholat).
function v4ActJenisSholat(type) {
  const n = String((type && type.name) || '').toLowerCase();
  if (v4KataKunciSholat('Dluha').some(k => n.includes(k))) return 'sholat_dluha';
  if (v4KataKunciSholat('Dzuhur').some(k => n.includes(k))) return 'sholat_dzuhur';
  return null;
}

// ---------- Kelas yang tidak ikut kegiatan ----------
// Contoh: kelas 1 & 2 pulang sebelum Dzuhur -> tidak ikut Sholat Dzuhur. Disimpan di jenis kegiatan sebagai string 'a|b'.
// Kelas yang tidak ikut TIDAK dianggap kurang/alpa: tidak ada status "tidak berlaku" yang dipaksakan ke siswa.
// Bawaan: Sholat Dzuhur tidak diikuti Kelas 1 & 2 (pulang lebih awal) selama Admin belum mengatur "Kelas Peserta".
// Sholat Dhuha: semua kelas ikut. Nilai '-' = Admin sudah menyimpan "semua kelas ikut" (menggantikan bawaan).
const V4_ACT_DZUHUR_TIDAK_IKUT = ['Kelas 1', 'Kelas 2'];
function v4ActKelasKecuali(type) {
  const raw = type && type.kelasTidakIkut;
  if (raw === '-') return [];
  if (!raw) return (type && v4ActJenisSholat(type) === 'sholat_dzuhur') ? V4_ACT_DZUHUR_TIDAK_IKUT.filter(k => KELAS_LIST.includes(k)) : [];
  const arr = Array.isArray(raw) ? raw : (typeof raw === 'object' ? Object.keys(raw).map(k => raw[k]) : String(raw).split('|'));
  return arr.map(x => String(x).trim()).filter(Boolean);
}
function v4ActKelasTidakIkut(typeKey, kelas) {
  const t = typeof typeKey === 'object' ? typeKey : v4ActTypeByKey(typeKey);
  return v4ActKelasKecuali(t).includes(kelas);
}
// Kelas yang ikut kegiatan itu (urutan KELAS_LIST). Tanpa type -> semua kelas.
function v4ActKelasAktif(type) {
  const kec = v4ActKelasKecuali(type);
  return kec.length ? KELAS_LIST.filter(k => !kec.includes(k)) : KELAS_LIST.slice();
}
function v4ActToggleKelasForm(typeKey) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  v4ActKelasFormOpen = (v4ActKelasFormOpen === typeKey) ? null : typeKey;
  v4RenderActivityCards();
}
function v4ActSimpanKelasPeserta(typeKey) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  const a = v4ActTypeByKey(typeKey); if (!a) return;
  const cbs = Array.from(document.querySelectorAll('input[data-v4kls="' + typeKey + '"]'));
  if (!cbs.length) return toast('Form tidak ditemukan, muat ulang halaman.', true);
  const tidakIkut = cbs.filter(cb => !cb.checked).map(cb => cb.value);
  if (tidakIkut.length >= cbs.length) return toast('Minimal satu kelas harus ikut kegiatan ini.', true);
  if (!v4ActButuhOnline('Mengubah kelas peserta butuh koneksi internet.')) return;
  // '-' = semua kelas ikut (bukan null: field kosong berarti memakai bawaan, Dzuhur tanpa Kelas 1 & 2).
  const upd = { kelasTidakIkut: tidakIkut.length ? tidakIkut.join('|') : '-', updatedAt: new Date().toISOString() };
  db.ref('activity_types_v4/' + typeKey).update(upd).then(() => {
    Object.assign(a, upd);
    v4ActKelasFormOpen = null;
    v4ActLogAman('ubah_kelas_peserta_kegiatan', a.name + ' - tidak ikut: ' + (tidakIkut.join(', ') || '(semua ikut)'));
    toast(tidakIkut.length ? '✅ ' + a.name + ': kelas ' + tidakIkut.join(', ') + ' tidak ikut' : '✅ ' + a.name + ': semua kelas ikut');
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(v4ActGagal);
}

// ---------- PJ & pengganti ----------
// Solusi kalau PJ tetap tidak bisa hadir: Admin/Kepsek menunjuk "Pengganti" untuk TANGGAL TERTENTU
// (PJ tetap tidak berubah). Admin & Kepsek selalu bisa mengisi absensi kegiatan apa pun sebagai jalan pintas.
// FIX: dulu `type.picKey===currentUser.key` bernilai true kalau keduanya undefined; sekarang dijaga.
// Catatan: untuk tanggal LAMPAU, check-in milik sendiri pada tanggal ITU (kuncinya <tanggal>_<kegiatan>) sengaja dihitung sebagai
// petugas hari itu supaya bisa melengkapi/memperbaiki absensinya; tidak berlaku untuk tanggal lain.
function v4IsActivityPic(type, tanggal) {
  if (!currentUser || !type) return false;
  if (v4ActAkuCocok(type.picKey, type.picName)) return true;
  const tgl = tanggal || v4Date();
  if (v4ActIsMine(v4ActCheckin(type.key, tgl))) return true; // petugas yang check-in (termasuk hasil klaim)
  const sub = V4.activitySubstitutes && V4.activitySubstitutes[type.key + '_' + tgl];
  return !!(sub && v4ActAkuCocok(sub.guruKey, sub.guruName));
}
function v4ActivitySubstituteToday(typeKey) { return V4.activitySubstitutes && V4.activitySubstitutes[typeKey + '_' + v4Date()]; }
function v4ToggleAppointSubstitute(typeKey) {
  if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti!', true);
  v4SubstituteFormOpenFor = (v4SubstituteFormOpenFor === typeKey) ? null : typeKey;
  v4RenderActivityCards();
}
function v4AppointActivitySubstitute(typeKey) {
  if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti untuk guru lain! Kalau Anda sendiri yang ingin menggantikan, pakai tombol "Saya Gantikan Hari Ini".', true);
  if (!v4ActButuhOnline('Menunjuk pengganti butuh koneksi internet.')) return;
  const sel = document.getElementById('v4SubstitutePick_' + typeKey);
  if (!sel) return toast('Form penunjukan tidak ditemukan, muat ulang halaman.', true);
  const guruValue = sel.value; if (!guruValue) return toast('Pilih guru pengganti dulu!', true);
  // Identitas guru = key, atau nama kalau key kosong. Nama bisa kembar -> tolak daripada menunjuk guru yang salah.
  const cocok = (allGuru || []).filter(g => (g.key || g.name) === guruValue);
  if (cocok.length === 0) return toast('Guru tidak ditemukan di daftar guru.', true);
  if (cocok.length > 1) return toast('Ada lebih dari satu guru dengan identitas yang sama (' + guruValue + '). Lengkapi data guru (key unik) dulu.', true);
  const guru = cocok[0];
  const type = v4ActTypeByKey(typeKey);
  if (type && v4ActSamaGuru(type.picKey, type.picName, guru.key, guru.name)) return toast(guru.name + ' sudah menjadi PJ tetap kegiatan ini.', true);
  const tgl = v4Date();
  // Form bisa basi (admin lain sudah menunjuk, belum disegarkan): jangan timpa diam-diam.
  const sudah = V4.activitySubstitutes && V4.activitySubstitutes[typeKey + '_' + tgl];
  if (sudah) return toast('Sudah ada pengganti hari ini (' + (sudah.guruName || '-') + '). Batalkan dulu kalau ingin mengganti.', true);
  const data = { typeId: typeKey, tanggal: tgl, guruKey: guru.key || guru.name, guruName: guru.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString() };
  db.ref('activity_substitute_v4/' + typeKey + '_' + tgl).set(data).then(() => {
    toast('✅ ' + guru.name + ' ditunjuk sebagai pengganti hari ini');
    v4ActLogAman('tunjuk_pengganti_kegiatan', typeKey + ' - ' + guru.name);
    if (!V4.activitySubstitutes) V4.activitySubstitutes = {};
    V4.activitySubstitutes[typeKey + '_' + tgl] = data;
    v4SubstituteFormOpenFor = null;
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(v4ActGagal);
}
// (Klaim sukarela lama diganti check-in QR: lihat v4ActMulaiScan/v4ActTulisCheckin di bagian bawah.)
function v4RemoveActivitySubstitute(typeKey) {
  const tgl = v4Date();
  const sub = V4.activitySubstitutes && V4.activitySubstitutes[typeKey + '_' + tgl];
  // Selain Admin/Kepala, guru yang tercatat sebagai pengganti hari itu boleh membatalkan penunjukannya sendiri.
  const sayaPengganti = !!sub && v4ActAkuCocok(sub.guruKey, sub.guruName);
  if (!v4IsAdmin() && !v4IsHead() && !sayaPengganti) return toast('Hanya Admin/Kepala Madrasah atau guru yang bersangkutan yang bisa membatalkan!', true);
  if (!v4ActButuhOnline('Membatalkan penunjukan butuh koneksi internet.')) return;
  db.ref('activity_substitute_v4/' + typeKey + '_' + tgl).remove().then(() => {
    toast('Penunjukan pengganti dibatalkan');
    if (V4.activitySubstitutes) delete V4.activitySubstitutes[typeKey + '_' + tgl];
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(v4ActGagal);
}

// ---------- CRUD jenis kegiatan (Admin) ----------
function v4OpenActivityTypeForm() {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  const box = document.getElementById('v4ActivityTypeForm'); if (!box) return;
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  const pic = document.getElementById('v4NewActPic');
  if (pic) pic.innerHTML = (allGuru || []).map(g => `<option value="${v4Safe(g.key || g.name)}" data-name="${v4Safe(g.name)}">${v4Safe(g.name)}</option>`).join('');
  const nameEl = document.getElementById('v4NewActName'); if (nameEl) nameEl.value = '';
  const honorEl = document.getElementById('v4NewActHonor'); if (honorEl) honorEl.checked = false;
}
function v4SaveNewActivityType() {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  if (isBusy('v4SaveNewActivityType')) return toast('Sedang menyimpan...', false, 1500);
  const name = (document.getElementById('v4NewActName').value || '').trim().replace(/\s+/g, ' ');
  if (!name) return toast('Nama kegiatan wajib diisi!', true);
  if (name.length > 60) return toast('Nama kegiatan maksimal 60 karakter!', true);
  // FIX: dulu tidak ada cek duplikat -> dua "Sholat Dhuha" membuat rekap & validasi sholat ganda.
  const lower = name.toLowerCase();
  if ((V4.activityTypes || []).some(a => String(a.name || '').trim().toLowerCase() === lower)) return toast('Kegiatan "' + name + '" sudah ada!', true);
  for (const s of ['Dluha', 'Dzuhur']) {
    if (v4KataKunciSholat(s).some(k => lower.includes(k)) && v4CariJenisKegiatanSholat(s).length) return toast('Jenis kegiatan Sholat ' + s + ' sudah ada (dibuat otomatis oleh sistem).', true);
  }
  const category = document.getElementById('v4NewActCategory').value;
  const picSel = document.getElementById('v4NewActPic');
  const picKey = picSel.value, picOpt = picSel.selectedOptions[0];
  const picName = picOpt ? (picOpt.dataset.name || picOpt.textContent) : '';
  if (!picKey) return toast('Pilih penanggung jawab!', true);
  if (!v4ActButuhOnline('Menambah jenis kegiatan butuh koneksi internet.')) return;
  const honor = document.getElementById('v4NewActHonor').checked;
  const btn = document.getElementById('btnSaveNewActivityType');
  setBusy('v4SaveNewActivityType', btn);
  const ref = db.ref('activity_types_v4').push();
  const data = { name, category, honorEnabled: honor, picKey, picName, createdAt: new Date().toISOString(), createdBy: currentUser.name };
  ref.set(data).then(() => {
    clearBusy('v4SaveNewActivityType', btn);
    toast('✅ Jenis kegiatan ditambahkan');
    const box = document.getElementById('v4ActivityTypeForm'); if (box) box.style.display = 'none';
    if (!Array.isArray(V4.activityTypes)) V4.activityTypes = [];
    V4.activityTypes.push(Object.assign({ key: ref.key }, data));
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(err => { clearBusy('v4SaveNewActivityType', btn); v4ActGagal(err); });
}
function v4ChangeActivityPic(key, picValue) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  if (!picValue) return;
  const guru = (allGuru || []).find(g => (g.key || g.name) === picValue); if (!guru) return;
  if (!v4ActButuhOnline('Mengganti PJ butuh koneksi internet.')) return v4RenderActivityCards();
  const upd = { picKey: guru.key || guru.name, picName: guru.name, updatedAt: new Date().toISOString() };
  db.ref('activity_types_v4/' + key).update(upd).then(() => {
    toast('✅ Penanggung jawab diperbarui');
    const t = v4ActTypeByKey(key); if (t) Object.assign(t, upd);
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(err => { v4ActGagal(err); v4RenderActivityCards(); });
}
function v4ToggleActivityHonor(key) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  const a = v4ActTypeByKey(key); if (!a) return;
  if (!v4ActButuhOnline('Mengubah honor butuh koneksi internet.')) return;
  const upd = { honorEnabled: !a.honorEnabled, updatedAt: new Date().toISOString() };
  db.ref('activity_types_v4/' + key).update(upd).then(() => {
    toast('Honor kegiatan diperbarui');
    Object.assign(a, upd);
    v4ActPersistCache();
    v4RenderActivityCards();
  }).catch(v4ActGagal);
}
function v4DeleteActivityType(key) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  const a = v4ActTypeByKey(key); if (!a) return;
  // FIX: jenis rutin (Sholat Dhuha/Dzuhur) dibuat otomatis oleh sistem & dipakai validasi absen sholat guru;
  // kalau dihapus, muncul lagi di login berikutnya (v4SeedJenisSholatRutin) dan data lama jadi yatim.
  if (a.rutin) return toast('Jenis kegiatan rutin (' + a.name + ') tidak bisa dihapus.', true);
  // Absensi dimuat per bulan, jadi hitungan ini hanya mencakup bulan yang sudah termuat (bukan seluruh tahun).
  const jml = (V4.activityAttendance || []).filter(r => r.activityTypeId === key).length;
  const info = `\n\nCatatan absensi lama${jml ? ` (minimal ${jml} di bulan yang sudah termuat)` : ' (kalau ada)'} yang terkait TIDAK ikut terhapus, tapi tidak akan tampil lagi di rekap.`;
  if (!confirm(`Hapus jenis kegiatan "${a.name}"?${info}`)) return;
  if (!v4ActButuhOnline('Menghapus jenis kegiatan butuh koneksi internet.')) return;
  db.ref('activity_types_v4/' + key).remove().then(() => {
    toast('Jenis kegiatan dihapus');
    V4.activityTypes = (V4.activityTypes || []).filter(t => t.key !== key);
    if (v4ActOpenTypeKey === key) v4ActOpenTypeKey = null;
    delete v4ActAttendanceDraft[key];
    v4ActPersistCache();
    v4RenderActivities();
  }).catch(v4ActGagal);
}

// ---------- Render ----------
// FIX: dulu SETIAP ketukan siswa memanggil v4RenderActivities() yang ikut menghitung ulang seluruh rekap
// bulanan (loop atas semua absensi). Sekarang dipecah: ketukan hanya render panel isi (v4RenderActivityFill).
function v4RenderActivities() {
  v4ActLoadCheckins(v4Date());   // check-in hari ini (live); idempoten
  v4RenderActivityCards();
  v4RenderActivityFill();
  v4RenderRekapReligiSiswa();
}
function v4RenderActivityCards() {
  const box = document.getElementById('v4ActivityConfig'); if (!box) return;
  const guruList = allGuru || [];
  box.innerHTML = (V4.activityTypes || []).length ? V4.activityTypes.map(a => {
    const k = escapeJs(a.key);
    const picValid = guruList.some(g => (g.key || g.name) === a.picKey);
    // FIX: untuk jenis rutin (picKey '-') dropdown dulu menampilkan guru pertama seolah-olah PJ-nya,
    // dan memilih guru itu tidak memicu onchange. Sekarang ada opsi "Belum ditunjuk".
    const picOptions = (picValid ? '' : '<option value="" selected disabled>-- Belum ditunjuk --</option>') +
      guruList.map(g => `<option value="${v4Safe(g.key || g.name)}" ${(g.key || g.name) === a.picKey ? 'selected' : ''}>${v4Safe(g.name)}</option>`).join('');
    const sub = v4ActivitySubstituteToday(a.key);
    const subFormOpen = v4SubstituteFormOpenFor === a.key;
    let subBlock = '';
    if (v4IsAdmin() || v4IsHead()) {
      if (sub) {
        subBlock = `<div style="margin-top:7px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 8px;font-size:11px;color:#92400e;">🔄 Pengganti hari ini: <strong>${v4Safe(sub.guruName)}</strong> <button class="btn btn-soft" style="padding:2px 7px;font-size:10px;min-height:22px;margin-left:4px;" onclick="v4RemoveActivitySubstitute('${k}')">Batalkan</button></div>`;
      } else {
        const subOptions = guruList.map(g => `<option value="${v4Safe(g.key || g.name)}">${v4Safe(g.name)}</option>`).join('');
        subBlock = `<div style="margin-top:7px;">
          <button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4ToggleAppointSubstitute('${k}')">🔄 PJ Tidak Bisa Hadir? Tunjuk Pengganti Hari Ini</button>
          ${subFormOpen ? `<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;"><select id="v4SubstitutePick_${v4Safe(a.key)}" class="field" style="font-size:11px;padding:5px;flex:1;min-width:120px;"><option value="">-- Pilih Guru --</option>${subOptions}</select><button class="btn btn-success" style="padding:4px 10px;font-size:10px;" onclick="v4AppointActivitySubstitute('${k}')">✔️ Tunjuk</button></div>` : ''}
        </div>`;
      }
    } else if (sub) {
      const sayaPengganti = v4ActAkuCocok(sub.guruKey, sub.guruName);
      subBlock = `<div style="margin-top:7px;font-size:11px;color:#92400e;">🔄 Pengganti hari ini: <strong>${v4Safe(sub.guruName)}</strong>${sayaPengganti ? ` <button class="btn btn-soft" style="padding:2px 7px;font-size:10px;min-height:22px;margin-left:4px;" onclick="v4RemoveActivitySubstitute('${k}')">Batalkan</button>` : ''}</div>`;
    }
    return `<div class="v4-card amalan-card">
      <div class="amalan-head"><h4>${v4Safe(a.name)}</h4>
        <span class="v4-chip">${v4Safe(a.category || 'Kegiatan')}</span>${a.honorEnabled ? '\n        <span class="v4-chip orange">💰 Honor aktif</span>' : ''}
      </div>
      <div class="amalan-pj"><span class="v4-chip blue">👤 PJ: ${v4Safe(a.picName || 'Belum ditunjuk')}</span>
        ${v4IsAdmin() ? `<select class="field" onchange="v4ChangeActivityPic('${k}', this.value)">${picOptions}</select>` : ''}</div>
      ${subBlock}
      ${v4ActCardExtra(a)}
      ${v4IsAdmin() ? `<div class="amalan-admin"><button class="btn btn-soft" onclick="v4ToggleActivityHonor('${k}')">💰 Ubah Honor</button>${a.rutin ? '' : `<button class="btn btn-soft" style="color:#b91c1c;" onclick="v4DeleteActivityType('${k}')">🗑️ Hapus</button>`}</div>` : ''}
    </div>`;
  }).join('') : '<div class="v4-card"><h4>Belum ada jenis kegiatan</h4><div class="v4-muted">Admin dapat menambahkan amalan/kegiatan (mis. Shalat Dhuha, Shalat Dzuhur) beserta penanggung jawabnya.</div></div>';
}
function v4RenderActivityFill() {
  const fillBox = document.getElementById('v4ActivityFillSection'); if (!fillBox) return;
  const types = V4.activityTypes || [];
  const myTypes = types.filter(a => v4IsAdmin() || v4IsHead() || v4IsActivityPic(a));
  if (myTypes.length === 0) {
    fillBox.innerHTML = types.length ? '<p class="v4-muted">Anda belum ditunjuk sebagai PJ kegiatan apa pun.</p>' : '';
    return;
  }
  fillBox.innerHTML = myTypes.map(type => {
    const isOpen = v4ActOpenTypeKey === type.key;
    const dateVal = v4ActDateSel[type.key] || v4Date();
    v4ActDateSel[type.key] = dateVal;
    const countToday = (V4.activityAttendance || []).filter(r => r.activityTypeId === type.key && r.tanggal === dateVal && r.status).length;
    // FIX: dulu catatan pengganti selalu memakai TANGGAL HARI INI walau panel sedang membuka tanggal lain.
    const sub = V4.activitySubstitutes && V4.activitySubstitutes[type.key + '_' + dateVal];
    const subNote = sub ? ` · 🔄 pengganti ${v4Safe(sub.guruName)} (${v4Safe(dateVal)})` : '';
    return `<div class="v4-task" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <div class="v4-task-main"><div class="v4-task-title">🕌 ${v4Safe(type.name)}</div><div class="v4-task-meta">${countToday} siswa tercatat tgl ${v4Safe(dateVal)}${subNote}</div></div>
        <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="v4ToggleActivityFill('${escapeJs(type.key)}')">${isOpen ? '✖️ Tutup' : '📋 Isi Absensi'}</button>
      </div>
      ${isOpen ? (v4ActBolehIsi(type, dateVal) ? v4RenderActivityFillPanel(type) : v4ActRenderCheckinBlock(type, dateVal)) : ''}
    </div>`;
  }).join('');
}

    // Rekap absensi SISWA untuk Sholat Dhuha/Dzuhur -- dua tampilan:
    // - "kelas": per tanggal dalam bulan terpilih, persentase kehadiran kelas itu.
    // - "siswa": per siswa dalam kelas terpilih, jumlah hadir dibanding hari yang benar-benar
    //   tercatat (bukan dibanding hari kalender -- supaya tidak perlu tahu kalender libur madrasah).
    // Kelas yang bisa dipilih dibatasi siswaScopeKelas() -- sama seperti Data Siswa/Rekap Nilai,
    // Wali Kelas cuma lihat kelasnya sendiri, Admin/Kepsek lihat semua.
    // Normalisasi status absensi kegiatan: kode H/S/I/A (format input) dan kata penuh (data lama) -> H/S/I/A.
    // Case-insensitive + trim: data lama/impor bisa bernilai 'hadir', 'HADIR', ' h', dst.
    const V4_STATUS_KEGIATAN_MAP = { h:'H', hadir:'H', s:'S', sakit:'S', i:'I', izin:'I', a:'A', alpa:'A', alpha:'A' };
    function v4NormStatusKegiatan(st) {
      if (typeof st !== 'string') return null;
      return V4_STATUS_KEGIATAN_MAP[st.trim().toLowerCase()] || null;
    }
    function v4ExportRekapReligi(fmt) {
      const t = v4RekapReligiLast;
      if (!t || !t.rows || !t.rows.length) return toast('Tidak ada data untuk diekspor.', true);
      // null/undefined -> sel kosong (bukan teks "null"/"undefined"); angka tetap angka untuk Excel, PDF memakai string.
      const celX = v => (v === null || v === undefined) ? '' : v;
      const celP = v => (v === null || v === undefined) ? '' : String(v);
      const nama = 'Rekap_Sholat_' + namaFileAman(t.fileTag);
      if (fmt === 'xlsx') {
        const xlsxSiap = typeof XLSX !== 'undefined' && XLSX.utils && typeof XLSX.writeFile === 'function';
        (xlsxSiap ? Promise.resolve() : ensureLib('xlsx')).then(() => {
          const ws = XLSX.utils.aoa_to_sheet([[celX(t.judul)], [], t.head.map(celX), ...t.rows.map(r => r.map(celX)), [], [celX(t.catatan)]]);
          ws['!cols'] = t.head.map((h, i) => ({ wch: (t.lebar && t.lebar[i]) || (i === 0 ? 24 : Math.max(10, String(h).length + 2)) }));
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
          XLSX.writeFile(wb, nama + '.xlsx');
        }).catch(e => toast('Gagal memuat library Excel (butuh internet): ' + (e && e.message || e), true));
      } else {
        const J = window.jspdf, pdfSiap = !!(J && J.jsPDF && J.jsPDF.API && typeof J.jsPDF.API.autoTable === 'function');
        (pdfSiap ? Promise.resolve() : ensureLib('pdf')).then(() => {
          const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4'); const w = doc.internal.pageSize.getWidth();
          doc.setFontSize(13); doc.text(doc.splitTextToSize(celP(t.judul), w - 28), w / 2, 14, { align: 'center' });
          doc.setFontSize(9); doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), w - 14, 24, { align: 'right' });
          doc.autoTable({ startY: 28, head: [t.head.map(celP)], body: t.rows.map(r => r.map(celP)), theme: 'striped', styles: { fontSize: t.pdfFont || 8 }, headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] } });
          if (t.catatan) { const y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 30) + 6; doc.setFontSize(8); doc.text(doc.splitTextToSize(t.catatan, w - 28), 14, y); }
          doc.save(nama + '.pdf');
        }).catch(e => toast('Gagal memuat library PDF (butuh internet): ' + (e && e.message || e), true));
      }
    }
    // ---- Komponen bersama tampilan rekap (tab, tabel) ----
    function v4RekapReligiTabsHtml() {
      const vw = v4RekapReligiState.view;
      const b = (id, label) => `<button class="btn ${vw===id?'btn-success':'btn-soft'}" onclick="v4RekapReligiState.view='${id}';v4RenderRekapReligiSiswa();">${label}</button>`;
      return `<div class="amalan-tabs">
        ${b('kelas','📅 Per Hari')}${b('siswa','🧑‍🎓 Per Siswa')}${b('pj','📋 Kepatuhan PJ')}${b('raport','📘 Raport')}${b('raportdesk','📝 Deskripsi Raport')}${b('alpa','🚨 Sering Alpa')}${b('petugas','👮 Petugas QR')}
        <span class="amalan-sp"><button class="btn btn-soft" onclick="v4ExportRekapReligi('xlsx')">📥 Excel</button><button class="btn btn-soft" onclick="v4ExportRekapReligi('pdf')">📄 PDF</button></span>
      </div>`;
    }
    function v4RekapReligiTabelHtml(tabel) {
      const per = tabel.peringatan ? `<div class="v4-card" style="border-left:4px solid #dc2626;color:#b91c1c;font-size:12px;">${v4Safe(tabel.peringatan)}</div>` : '';
      if (!tabel.rows.length) return per + `<div class="v4-card"><div class="v4-muted">${v4Safe(tabel.kosong)}</div></div>`;
      const th = tabel.head.map(h => `<th>${v4Safe(h)}</th>`).join('');
      const tr = tabel.rows.map(r => `<tr>${r.map(c => { const t = String(c); const merah = t.startsWith('BELUM'); return `<td${merah ? ' style="color:#b91c1c;font-weight:700;"' : ''}>${v4Safe(t)}</td>`; }).join('')}</tr>`).join('');
      return per + `<div class="v4-card amalan-table"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div><div class="v4-muted amalan-note">${v4Safe(tabel.catatan || '')}</div>`;
    }

    // Absensi kegiatan dimuat per bulan (lihat v4ActPastikan di app.js). Dipakai semua tampilan rekap: true = data bulan
    // sudah siap ditampilkan; false = host diisi "memuat" lalu rekap dirender ulang otomatis setelah data datang.
    function v4ActButuhBulan(daftar, host) {
      if (v4ActSiap(daftar)) return true;
      host.innerHTML = '<div class="v4-card"><div class="v4-muted">⏳ Memuat data absensi bulan terkait...</div></div>';
      v4ActPastikan(daftar).then(ok => {
        if (!ok && navigator.onLine) toast('Sebagian data absensi gagal dimuat, rekap bisa belum lengkap. Coba segarkan.', true);
        try { v4RenderRekapReligiSiswa(); } catch (e) { /* halaman sudah ditinggalkan */ }
      });
      return false;
    }
    // ---- Rekap Petugas QR: check-in PJ / pengganti per kegiatan (node activity_checkin_v4) ----
    // Data diambil per bulan lewat query rentang kunci '<YYYY-MM>-' (kunci = '<tanggal>_<typeKey>'), di-cache per bulan.
    // Admin/Kepala Madrasah melihat semua petugas; guru lain hanya melihat catatannya sendiri.
    function v4RekapPetugasMuat(thn, bln, paksa) {
      const ym = thn + '-' + String(bln).padStart(2, '0');
      const c = v4RekapPetugasCache[ym];
      if (c && c.status === 'loading') return;
      if (c && c.status === 'ok' && !paksa && (ym < v4Date().slice(0, 7) || Date.now() - c.at < 60000)) return;
      if (typeof db === 'undefined' || !db) return;
      // Offline: once('value') tanpa cache tidak pernah selesai -> jangan menggantung di "Memuat...".
      if (!navigator.onLine) { v4RekapPetugasCache[ym] = { status: 'gagal', data: (c && c.data) || null, at: 0, msg: 'offline' }; return; }
      v4RekapPetugasCache[ym] = { status: 'loading', data: (c && c.data) || null, at: 0 };
      const epoch = v4ActEpoch;
      const bacaCheckin = db.ref('activity_checkin_v4').orderByKey().startAt(ym + '-').endAt(ym + '-').once('value');
      const batasWaktu = new Promise((_, tolak) => setTimeout(() => tolak(new Error('Server belum merespons.')), 15000));
      Promise.race([bacaCheckin, batasWaktu]).then(snap => {
        if (epoch !== v4ActEpoch) return;   // logout selagi memuat
        v4RekapPetugasCache[ym] = { status: 'ok', data: snap.val() || {}, at: Date.now() };
      }).catch(err => {
        if (epoch !== v4ActEpoch) return;
        console.warn('[SI MAMBA] Gagal memuat rekap petugas QR:', err && err.message || err);
        v4RekapPetugasCache[ym] = { status: 'gagal', data: (c && c.data) || null, at: 0, msg: (err && err.message) || String(err) };
      }).then(() => { if (epoch === v4ActEpoch && v4RekapReligiState.view === 'petugas') v4RenderRekapReligiSiswa(); });
    }
    // Jadwal petugas: untuk tiap kegiatan sholat & tiap hari berlaku (s.d. hari ini) di bulan itu, apakah ada check-in.
    // Hari dianggap "hari sekolah" bila ada absensi siswa tercatat untuk kegiatan itu pada tanggal tsb (kalender libur tidak diketahui
    // aplikasi), atau sudah ada check-in. Hari tanpa keduanya dilewati (kemungkinan libur). Hari ini baru dinilai setelah klaim pengganti
    // dibuka (jam mulai + toleransi).
    function v4RekapPetugasJadwal(thn, bln, data, bolehLihat) {
      const ym = thn + '-' + String(bln).padStart(2, '0'), hariIni = v4Date();
      const lastDay = new Date(thn, bln, 0).getDate();
      const out = [];
      const types = (V4.activityTypes || []).filter(t => v4ActJenisSholat(t));
      const absen = (V4.activityAttendance || []).filter(r => r.status && r.tanggal && r.tanggal.slice(0, 7) === ym);
      types.forEach(t => {
        if (!bolehLihat(t)) return;
        const jenis = v4ActJenisSholat(t);
        const jamBuka = v4ActMenit(v4ActJamMulai(t)) + V4_ACT_GRACE_MENIT;
        for (let d = 1; d <= lastDay; d++) {
          const tgl = `${ym}-${String(d).padStart(2, '0')}`;
          if (tgl > hariIni) break;
          if (!v4HariDiizinkanSholat(jenis, tgl)) continue;
          const ci = data[tgl + '_' + t.key];
          if (ci) { out.push({ tgl, type: t, ci, ada: true }); continue; }
          const absenHari = absen.filter(r => r.activityTypeId === t.key && r.tanggal === tgl);
          if (!absenHari.length) continue;   // tidak ada tanda hari sekolah
          if (tgl === hariIni && v4ActMenitSekarang() < jamBuka) continue;
          const oleh = [...new Set(absenHari.map(r => r.recordedBy).filter(Boolean))].join(', ');
          out.push({ tgl, type: t, ci: null, ada: false, oleh });
        }
      });
      return out;
    }
    function v4RenderRekapPetugas(host) {
      const st = v4RekapReligiState, now = new Date();
      if (!st.bulan) st.bulan = now.getMonth() + 1;
      if (!st.tahun) st.tahun = now.getFullYear();
      if (!v4ActButuhBulan([st.tahun + '-' + String(st.bulan).padStart(2, '0')], host)) return;
      const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const bulanOptions = namaBulan.map((n, i) => `<option value="${i+1}" ${st.bulan===i+1?'selected':''}>${n}</option>`).join('');
      const tSkrg = now.getFullYear();
      const tahunOptions = [tSkrg - 1, tSkrg, tSkrg + 1].map(t => `<option value="${t}" ${st.tahun===t?'selected':''}>${t}</option>`).join('');
      const adm = v4IsAdmin() || v4IsHead();
      const mode = st.petugasMode === 'guru' ? 'guru' : 'detail';
      const modeBtn = (id, label) => `<button class="btn ${mode===id?'btn-success':'btn-soft'}" onclick="v4RekapReligiState.petugasMode='${id}';v4RenderRekapReligiSiswa();">${label}</button>`;
      const controlsHtml = `<div class="v4-card"><div class="amalan-filters">
        <div><label class="label">Bulan</label><select class="field" onchange="v4RekapReligiState.bulan=Number(this.value);v4RenderRekapReligiSiswa();">${bulanOptions}</select></div>
        <div><label class="label">Tahun</label><select class="field" onchange="v4RekapReligiState.tahun=Number(this.value);v4RenderRekapReligiSiswa();">${tahunOptions}</select></div>
        <div class="amalan-reload"><button class="btn btn-soft" onclick="v4RekapPetugasMuat(v4RekapReligiState.tahun, v4RekapReligiState.bulan, true);v4HonorSholatSiapkan(v4RekapReligiState.tahun, v4RekapReligiState.bulan, true).then(() => v4RenderRekapReligiSiswa());v4RenderRekapReligiSiswa();">🔄 Muat ulang</button></div>
      </div>
      ${v4RekapReligiTabsHtml()}
      <div class="amalan-tabs">${modeBtn('detail','🗒️ Rincian per Hari')}${modeBtn('guru','👤 Ringkasan per Guru')}</div></div>`;

      const ym = st.tahun + '-' + String(st.bulan).padStart(2, '0');
      v4RekapPetugasMuat(st.tahun, st.bulan, false);
      const c = v4RekapPetugasCache[ym];
      const judulBln = `${namaBulan[st.bulan - 1]} ${st.tahun}`;
      if (!c || (c.status === 'loading' && !c.data)) { v4RekapReligiLast = null; host.innerHTML = controlsHtml + '<div class="v4-card"><div class="v4-muted">⏳ Memuat data check-in petugas...</div></div>'; return; }
      if (c.status === 'gagal' && !c.data) {
        v4RekapReligiLast = null;
        const ditolak = /permission[_ ]denied/i.test(c.msg || '');
        if (c.msg === 'offline') { host.innerHTML = controlsHtml + '<div class="v4-card"><div class="v4-muted">📡 Offline: rekap petugas butuh internet. Sambungkan internet, lalu tekan "Muat ulang".</div></div>'; return; }
        host.innerHTML = controlsHtml + `<div class="v4-card"><div class="v4-muted">❌ Gagal memuat data check-in petugas${ditolak ? ' (ditolak Rules Firebase, minta Admin memeriksa akses baca node activity_checkin_v4)' : ''}. Tekan "Muat ulang" untuk mencoba lagi.</div></div>`;
        return;
      }
      const saya = typeof v4ActMyId === 'function' ? v4ActMyId() : '';
      const data = c.data || {};
      // Check-in tercatat (Admin/Kepsek: semua; guru lain: miliknya sendiri).
      const recs = Object.keys(data).map(k => {
        const d = data[k] || {};
        const tgl = d.tanggal || k.slice(0, 10), typeId = d.typeId || k.slice(11);
        const tp = v4ActTypeByKey(typeId);
        return Object.assign({}, d, { _tgl: tgl, _kegiatan: tp ? tp.name : (typeId || '-') });
      }).filter(r => r._tgl && r._tgl.slice(0, 7) === ym && (adm || (saya && r.guruKey === saya)));
      // Jadwal sholat: Admin/Kepsek semua kegiatan; guru lain hanya kegiatan yang ia PJ-i.
      const jadwal = v4RekapPetugasJadwal(st.tahun, st.bulan, data, t => adm || v4ActAkuCocok(t.picKey, t.picName));
      const belum = jadwal.filter(j => !j.ada);

      const jam = r => r.at ? new Date(r.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') : '-';
      const klaimR = r => !!r.klaim || /klaim/i.test(r.peran || '');
      const peranDasar = r => klaimR(r) ? 'Pengganti (klaim)' : (/^pengganti/i.test(r.peran || '') ? 'Pengganti' : 'PJ');
      let tabel;
      if (mode === 'guru') {
        const per = {};
        const namaDari = (key, nama) => { const g = key && (allGuru || []).find(x => x && x.key === key); return (g && g.name) || nama || key || '-'; };
        const ambil = nama => per[nama] || (per[nama] = { n: 0, peng: 0, klaim: 0, off: 0, jadwal: 0, hadirPj: 0, ciDl: 0, ciDz: 0, hdDl: 0, hdDz: 0 });
        recs.forEach(r => {
          const g = ambil(namaDari(r.guruKey, r.guruName)); g.n++;
          const p = peranDasar(r);
          if (p === 'Pengganti') g.peng++; else if (p !== 'PJ') g.klaim++;
                    if (r.offline) g.off++;
          const jn = v4ActJenisSholat(v4ActTypeByKey(r.typeId || ''));
          if (jn === 'sholat_dluha') g.ciDl++; else if (jn === 'sholat_dzuhur') g.ciDz++;
        });
        // Hari jadwal & kehadiran sebagai PJ: tiap hari berlaku dihitung untuk PJ kegiatan itu (hadir bila check-in-nya atas nama PJ).
        jadwal.forEach(j => {
          const nama = j.type.picName; if (!nama) return;
          const g = ambil(namaDari(j.type.picKey, nama)); g.jadwal++;
          if (j.ada && peranDasar(j.ci) === 'PJ' && v4ActSamaGuru(j.type.picKey, j.type.picName, j.ci.guruKey, j.ci.guruName)) g.hadirPj++;
        });
        // Honor sholat = hari check-in dengan absensi siswa LENGKAP (lihat v4HonorSholatSiapkan). Ditampilkan per guru.
        const chH = v4HonorSholatCache[v4HonorSholatYm(st.tahun, st.bulan)];
        if (!chH || (chH.status !== 'siap' && chH.status !== 'gagal')) v4HonorSholatSiapkan(st.tahun, st.bulan).then(() => { if (v4RekapReligiState.view === 'petugas') v4RenderRekapReligiSiswa(); });
        const hariHonor = v4HonorSholatHari(st.tahun, st.bulan).filter(h => adm || v4ActAkuCocok(h.guruKey, h.guruName));
        const tarif = (typeof v4GetHonorRates === 'function') ? v4GetHonorRates() : { dluha: 0, dzuhur: 0 };
        const honorPer = {};   // nama -> { ok, belum, rp, alasan: [] }
        hariHonor.forEach(h => {
          const nm = namaDari(h.guruKey, h.guruName);
          const g = honorPer[nm] || (honorPer[nm] = { ok: 0, belum: 0, rp: 0, alasan: [] });
          const jn = h.jenis === 'sholat_dluha' ? 'Dh' : 'Dz';
          if (h.ok) { g.ok++; return; }
          g.belum++; g.rp += (h.jenis === 'sholat_dluha' ? tarif.dluha : tarif.dzuhur) || 0;
          g.alasan.push(h.tgl.slice(8) + jn + ': ' + (h.kurang.length ? h.kurang.map(x => x.kelas + ' ' + x.belum + ' siswa').join(', ') : h.alasan));
        });
        Object.keys(honorPer).forEach(nm => ambil(nm));
        tabel = {
          judul: `Rekap Petugas QR - Ringkasan per Guru - ${judulBln}`, fileTag: `PetugasQR_PerGuru_${namaBulan[st.bulan - 1]}_${st.tahun}`,
          head: ['Nama Guru', 'Hari Jadwal PJ', 'Hadir sbg PJ', '% Hadir PJ', 'Total Bertugas', 'Pengganti (ditunjuk)', 'Pengganti (klaim)', 'Via Offline', 'Check-in Dhuha', 'Check-in Dzuhur', 'Honor Masuk (hari)', 'Honor BELUM Masuk (hari)', 'Perkiraan Rp Belum Masuk', 'Alasan Belum Masuk'],
          rows: Object.keys(per).sort((a, b) => COLLATOR_ID.compare(a, b)).map(n => {
            const g = per[n], hp = honorPer[n] || { ok: 0, belum: 0, rp: 0, alasan: [] };
            return [n, g.jadwal || '-', g.jadwal ? g.hadirPj : '-', g.jadwal ? Math.round(g.hadirPj / g.jadwal * 100) + '%' : '-', g.n, g.peng, g.klaim, g.off, g.ciDl, g.ciDz, hp.ok, hp.belum ? 'BELUM ' + hp.belum : 0, hp.rp, hp.alasan.join('; ') || '-'];
          }),
          catatan: 'Honor sholat dihitung dari check-in + absensi siswa lengkap (berlaku mulai ' + V4_HONOR_SHOLAT_CHECKIN_MULAI + '). Dh = Dhuha, Dz = Dzuhur. Rp = perkiraan dari tarif sekarang.',
          kosong: 'Belum ada check-in petugas pada bulan ini.'
        };
      } else {
        const chR = v4HonorSholatCache[v4HonorSholatYm(st.tahun, st.bulan)];
        if (!chR || (chR.status !== 'siap' && chR.status !== 'gagal')) v4HonorSholatSiapkan(st.tahun, st.bulan).then(() => { if (v4RekapReligiState.view === 'petugas') v4RenderRekapReligiSiswa(); });
        const baris = recs.map(r => { const sh = v4HonorStatusHari(r); return { tgl: r._tgl, kg: r._kegiatan, row: [r._tgl, r._kegiatan, r.guruName || r.guruKey || '-', peranDasar(r), jam(r) + (sh.luarJam ? ' ⚠ di luar jam' : ''), (r.jarak == null ? '-' : r.jarak), sh.teks, [r.offline ? 'Offline (jam perangkat)' : '', v4HonorPengisiLain(r)].filter(Boolean).join('; ') || '-'] }; });
        belum.forEach(j => {
          const sub = V4.activitySubstitutes && V4.activitySubstitutes[j.type.key + '_' + j.tgl];
          baris.push({ tgl: j.tgl, kg: j.type.name, row: [j.tgl, j.type.name, 'BELUM CHECK-IN', 'PJ: ' + (j.type.picName || 'belum ditunjuk') + (sub ? ' (pengganti ditunjuk: ' + sub.guruName + ')' : ''), '-', '-', '-', j.oleh ? 'Absensi siswa diisi: ' + j.oleh : '-'] });
        });
        baris.sort((a, b) => (a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : COLLATOR_ID.compare(a.kg, b.kg)));
        tabel = {
          judul: `Rekap Petugas QR - Rincian per Hari - ${judulBln}`, fileTag: `PetugasQR_Rincian_${namaBulan[st.bulan - 1]}_${st.tahun}`,
          head: ['Tanggal', 'Kegiatan', 'Petugas', 'Peran', 'Jam Check-in', 'Jarak (m)', 'Status Honor', 'Keterangan'],
          rows: baris.map(x => x.row),
          catatan: `Belum check-in: ${belum.length} hari-kegiatan.`,
          kosong: 'Belum ada check-in petugas pada bulan ini.'
        };
      }
      v4RekapReligiLast = tabel;
      const info = c.status === 'loading' ? '<div class="v4-muted" style="font-size:11px;margin-top:6px;">⏳ Memperbarui data...</div>' : (c.status === 'gagal' ? '<div class="v4-muted" style="font-size:11px;margin-top:6px;color:#b91c1c;">Gagal memperbarui, menampilkan data sebelumnya.</div>' : '');
      host.innerHTML = controlsHtml + info + v4RekapReligiTabelHtml(tabel);
    }
    // ---- Tab "Raport": rekap kehadiran sholat per SEMESTER per siswa, siap dipakai untuk raport ----
    // Semester: Ganjil = Juli-Desember tahun awal tahun ajaran; Genap = Januari-Juni tahun akhir. Data = tahun ajaran aktif; bulan semester dimuat sesuai kebutuhan lewat v4ActPastikan() (V4.activityAttendance hanya berisi bulan yang sudah dimuat).
    const V4_RAPORT_AMBANG_DEFAULT = { sb: 90, b: 80, c: 70 };   // % hadir minimal: Sangat Baik / Baik / Cukup (di bawahnya: Perlu Bimbingan)
    // true: PREDIKAT dihitung dari H / (H+A) -- sakit & izin tidak menurunkan predikat (siswa sakit tidak dinilai "kurang"). Kolom % tetap H / (H+S+I+A).
    // false: predikat memakai % yang sama dengan kolom %.
    const V4_RAPORT_UDZUR_TIDAK_MERUGIKAN = true;
    function v4RaportSemester() {
      const s = v4RekapReligiState.semester;
      if (s === 'Ganjil' || s === 'Genap') return s;
      return (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif === 'Genap') ? 'Genap' : 'Ganjil';
    }
    function v4RaportFilterHtml() {
      const sm = v4RaportSemester(), a = Object.assign({}, V4_RAPORT_AMBANG_DEFAULT, v4RekapReligiState.ambang || {});
      const num = (key, label) => `<div><label class="label">${label}</label><input class="field" type="number" min="1" max="100" style="max-width:96px;" value="${a[key]}" onchange="v4RaportAmbang('${key}', this.value)"></div>`;
      return `<div><label class="label">Semester</label><select class="field" onchange="v4RekapReligiState.semester=this.value;v4RenderRekapReligiSiswa();"><option value="Ganjil" ${sm === 'Ganjil' ? 'selected' : ''}>Ganjil (Juli-Desember)</option><option value="Genap" ${sm === 'Genap' ? 'selected' : ''}>Genap (Januari-Juni)</option></select></div>
        <div><label class="label">Tahun Ajaran</label><div class="field" style="display:flex;align-items:center;">${v4Safe(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '-')}</div></div>
        ${num('sb', 'Sangat Baik ≥ (%)')}${num('b', 'Baik ≥ (%)')}${num('c', 'Cukup ≥ (%)')}
        ${(v4RekapReligiState.view === 'raport' && v4RaportBolehTerbit(v4RekapReligiState.kelas)) ? `<div><label class="label">&nbsp;</label><button class="btn btn-success" onclick="v4RaportTerbitkan()">📤 Terbitkan ke Portal Ortu</button></div>` : ''}`;
    }
    function v4RaportAmbang(key, val) {
      const a = Object.assign({}, V4_RAPORT_AMBANG_DEFAULT, v4RekapReligiState.ambang || {});
      const n = Math.round(Number(val));
      const calon = Object.assign({}, a, { [key]: n });
      if (!(n >= 1 && n <= 100) || !(calon.sb > calon.b && calon.b > calon.c)) { toast('Ambang harus 1-100 dan berurutan: Sangat Baik > Baik > Cukup.', true); v4RenderRekapReligiSiswa(); return; }
      v4RekapReligiState.ambang = calon;   // tidak disimpan permanen: berlaku untuk tampilan & ekspor sesi ini
      v4RenderRekapReligiSiswa();
    }
    // ---- Terbitkan rekap semester ke Portal Ortu ----
    // Orang tua TIDAK membaca absensi mentah (ribuan catatan): wali kelas menerbitkan ringkasan per siswa ke node
    // rekap_sholat_raport/<tahunAjaran>_<semester>/<siswaKey> setelah memeriksa angkanya. Boleh: Admin, Kepala Madrasah, dan wali kelas kelas itu.
    function v4RaportBolehTerbit(kelas) {
      if (!currentUser || !kelas) return false;
      if (v4IsAdmin() || v4IsHead()) return true;
      return typeof isWaliKelasAssigned === 'function' && isWaliKelasAssigned() && currentUser.waliKelasOf === kelas;
    }
    let v4RaportTerbitSibuk = false;
    function v4RaportTerbitkan() {
      const t = v4RekapReligiLast, pub = t && t.publikasi;
      if (!pub || v4RekapReligiState.view !== 'raport') return toast('Buka tab Raport dulu.', true);
      if (!v4RaportBolehTerbit(pub.kelas)) return toast('Hanya Admin, Kepala Madrasah, atau wali kelas ' + pub.kelas + ' yang boleh menerbitkan.', true);
      if (!pub.items.length) return toast('Tidak ada siswa di kelas ini.', true);
      if (!navigator.onLine) return toast('📡 Butuh koneksi internet untuk menerbitkan.', true);
      if (v4RaportTerbitSibuk) return;
      const adaT = pub.items.filter(it => (it.dhuha && it.dhuha.T > 0) || (it.dzuhur && it.dzuhur.T > 0)).length;
      let pesan = `Terbitkan rekap sholat Semester ${pub.semester} ${pub.tahunAjaran} untuk ${pub.items.length} siswa kelas ${pub.kelas} ke Portal Orang Tua?\n\nOrang tua akan melihat H/S/I/A, persen hadir, dan predikat anaknya.`;
      if (!pub.lengkap) pesan += `\n\nPERHATIAN: ada hari yang kelas ini belum tercatat (lihat banner merah). Rekap akan ditandai "masih sementara".`;
      if (adaT) pesan += `\n\n${adaT} siswa punya hari "tidak tercatat" (tanda *).`;
      pesan += `\n\nMenerbitkan ulang akan menimpa rekap sebelumnya untuk semester ini.`;
      if (!confirm(pesan)) return;
      const waktu = new Date().toISOString(), updates = {};
      pub.items.forEach(it => {
        updates[`rekap_sholat_raport/${pub.periode}/${it.key}`] = {
          tahunAjaran: pub.tahunAjaran, semester: pub.semester, kelas: pub.kelas, dhuha: it.dhuha, dzuhur: it.dzuhur, deskripsi: it.deskripsi || '',
          ambang: pub.ambang, udzur: pub.udzur, lengkap: pub.lengkap, diterbitkanOleh: currentUser.name || '', diterbitkanPada: waktu
        };
      });
      v4RaportTerbitSibuk = true;
      db.ref().update(updates).then(() => {
        toast(`✅ Rekap ${pub.items.length} siswa kelas ${pub.kelas} (Semester ${pub.semester}) diterbitkan ke Portal Orang Tua.`);
        try { addLog('terbit_rekap_sholat', `${pub.kelas} - ${pub.semester} ${pub.tahunAjaran} - ${pub.items.length} siswa`); } catch (e) {}
      }).catch(e => {
        const ditolak = e && /permission/i.test(String(e.message || e.code || e));
        toast(ditolak ? '❌ Ditolak Firebase Rules: node "rekap_sholat_raport" belum diizinkan. Tambahkan aturannya dulu (minta Admin teknis).' : '❌ Gagal menerbitkan: ' + (e && e.message || e), true, 8000);
      }).then(() => { v4RaportTerbitSibuk = false; });
    }
    // Deskripsi otomatis untuk raport, dari ringkasan angka (lihat ringkas() di v4RaportTabel). Murni faktual: jumlah hari, persen, dan
    // kata penilaian dari predikat. SELALU perlu diperiksa wali kelas sebelum masuk raport. Sholat yang kelasnya tidak ikut dilewati.
    function v4RaportDeskripsi(nama, dh, dz) {
      const adj = { 'Sangat Baik': 'predikat Sangat Baik', 'Baik': 'predikat Baik', 'Cukup': 'predikat Cukup dan perlu ditingkatkan', 'Perlu Bimbingan': 'predikat Perlu Bimbingan sehingga perlu pembiasaan lebih lanjut' };
      const kal = [], adaUdzur = [dh, dz].some(r => r && r.ada && (r.S + r.I) > 0), totT = [dh, dz].reduce((a, r) => a + ((r && r.ada) ? (r.T || 0) : 0), 0);
      [['Dhuha', dh], ['Dzuhur', dz]].forEach(([n, r]) => {
        if (!r || !r.ada) return;
        const tot = r.H + r.S + r.I + r.A;
        if (!tot) return;                                             // belum ada data siswa ini untuk sholat tsb
        const pertama = kal.length === 0, udz = r.S + r.I;
        if (r.pred === null || r.pred === undefined) {                // hanya sakit/izin: belum bisa dinilai
          kal.push(`Pada Sholat ${n} berjamaah, ananda${pertama ? ' ' + nama : ''} berhalangan hadir karena sakit/izin (${udz} hari) sehingga belum dapat dinilai.`);
          return;
        }
        const ekstra = [];
        if (udz) ekstra.push(`sakit/izin ${udz} hari`);
        if (r.A) ekstra.push(`alpa ${r.A} hari`);
        const rinci = `hadir ${r.H} dari ${tot} hari, ${r.pct}%${ekstra.length ? '; ' + ekstra.join(', ') : ''}`;
        kal.push(`Pada Sholat ${n} berjamaah, ananda${pertama ? ' ' + nama : ''} memperoleh ${adj[r.pred] || ('predikat ' + r.pred)} dalam kehadiran (${rinci}).`);
      });
      if (!kal.length) return `Belum ada data kehadiran sholat berjamaah ananda ${nama} pada semester ini.`;
      let teks = kal.join(' ');
      if (adaUdzur && V4_RAPORT_UDZUR_TIDAK_MERUGIKAN) teks += ' Sakit/izin tidak mengurangi penilaian.';
      if (totT) teks += ` Catatan: ${totT} hari belum tercatat dan tidak dihitung.`;
      return teks;
    }
    function v4RaportDeskTabel(kelasTxt, siswaKelas, dluhaTypes, dzuhurTypes) {
      const t = v4RaportTabel(kelasTxt, siswaKelas, dluhaTypes, dzuhurTypes), pub = t.publikasi;
      const desk = new Map(pub.items.map(it => [it.key, it.deskripsi]));
      return {
        judul: t.judul.replace('Rekap Kehadiran Sholat untuk Raport', 'Deskripsi Raport Sholat Berjamaah'), fileTag: t.fileTag.replace('Raport_', 'DeskripsiRaport_'),
        head: ['Nama Siswa', 'Deskripsi'], lebar: [24, 120], pdfFont: 9,
        rows: siswaKelas.slice().sort((x, y) => COLLATOR_ID.compare(x.name, y.name)).map(st => [st.name, desk.get(st.key) || '']),
        catatan: `Deskripsi dibuat otomatis dari rekap angka tab Raport (jumlah hari hadir dan persen kehadiran). Periksa dan sesuaikan dulu sebelum dimasukkan ke raport. Predikat: Sangat Baik ≥ ${pub.ambang.sb}%, Baik ≥ ${pub.ambang.b}%, Cukup ≥ ${pub.ambang.c}%.${t.peringatan ? ' ' + t.peringatan : ''}`,
        peringatan: t.peringatan, kosong: t.kosong
      };
    }
    // -> tabel siap tampil/ekspor. Aturan hitung:
    //  - Hari efektif kelas = hari sholat yang berlaku (v4HariDiizinkanSholat) dan kelas ini punya SETIDAKNYA satu catatan hari itu.
    //  - H/S/I/A = status siswa pada hari efektif. T (tidak tercatat) = hari efektif tanpa status siswa itu; TIDAK dihitung ke persen.
    //  - % Hadir = H / (H+S+I+A). Predikat dari ambang; tanda * kalau siswa itu punya hari T.
    //  - Kelas yang tidak ikut kegiatan (kelasTidakIkut) tampil "-" dan tidak dinilai.
    //  - Hari ada data sekolah tapi kelas ini tidak tercatat sama sekali -> PERINGATAN (lengkapi sebelum raport dicetak).
    function v4RaportTabel(kelasTxt, siswaKelas, dluhaTypes, dzuhurTypes) {
      const sm = v4RaportSemester(), a = Object.assign({}, V4_RAPORT_AMBANG_DEFAULT, v4RekapReligiState.ambang || {});
      const ta = String(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '');
      const mt = ta.match(/(\d{4})\D+(\d{4})/);
      const y1 = mt ? Number(mt[1]) : new Date().getFullYear(), y2 = mt ? Number(mt[2]) : y1 + 1;
      const awal = sm === 'Ganjil' ? `${y1}-07-01` : `${y2}-01-01`, akhir = sm === 'Ganjil' ? `${y1}-12-31` : `${y2}-06-30`;
      const hariIni = tglLokal(), batas = hariIni < akhir ? hariIni : akhir;
      const tanggalR = [];
      for (let d = new Date(awal + 'T00:00:00'); tglLokal(d) <= batas; d.setDate(d.getDate() + 1)) tanggalR.push(tglLokal(d));
      const predikat = p => p >= a.sb ? 'Sangat Baik' : p >= a.b ? 'Baik' : p >= a.c ? 'Cukup' : 'Perlu Bimbingan';
      const keyKelas = new Set(siswaKelas.map(s => s.key));
      const semuaRec = (V4.activityAttendance || []).filter(r => r.tanggal >= awal && r.tanggal <= batas && v4NormStatusKegiatan(r.status));
      const liburR = (typeof monitorLiburSet === 'function') ? monitorLiburSet() : new Set();
      const hitungJenis = (nama, keys, jenis) => {
        if (!keys.length) return { nama, ada: false };
        if (keys.every(tk => v4ActKelasTidakIkut(tk, kelasTxt))) return { nama, ada: false, tidakIkut: true };
        const recJ = semuaRec.filter(r => keys.includes(r.activityTypeId));
        const sekolahTgl = new Set(recJ.map(r => r.tanggal));
        const statusSiswa = new Map();                       // studentId -> Map(tanggal -> H|S|I|A)
        recJ.forEach(r => {
          if (!keyKelas.has(r.studentId)) return;
          let m = statusSiswa.get(r.studentId); if (!m) { m = new Map(); statusSiswa.set(r.studentId, m); }
          m.set(r.tanggal, v4NormStatusKegiatan(r.status));
        });
        const kelasTgl = new Set(); statusSiswa.forEach(m => m.forEach((_, t) => kelasTgl.add(t)));
        const berlaku = t => v4HariDiizinkanSholat(jenis, t);
        return {
          nama, ada: true, statusSiswa,
          efektif: tanggalR.filter(t => berlaku(t) && kelasTgl.has(t)),
          tidakTercatat: tanggalR.filter(t => berlaku(t) && sekolahTgl.has(t) && !kelasTgl.has(t) && !liburR.has(t))
        };
      };
      const J = [hitungJenis('Dhuha', dluhaTypes, 'sholat_dluha'), hitungJenis('Dzuhur', dzuhurTypes, 'sholat_dzuhur')];
      // Ringkasan terstruktur per siswa per sholat (dipakai tabel DAN data yang diterbitkan ke Portal Ortu).
      const ringkas = (h, key) => {
        if (!h.ada) return h.tidakIkut ? { ada: false, tidakIkut: true } : { ada: false };
        const m = h.statusSiswa.get(key) || new Map(), c = { H: 0, S: 0, I: 0, A: 0 };
        h.efektif.forEach(t => { const st = m.get(t); if (st) c[st]++; });
        const tot = c.H + c.S + c.I + c.A, T = h.efektif.length - tot;
        const p = tot ? Math.round(c.H / tot * 100) : null;
        const pp = V4_RAPORT_UDZUR_TIDAK_MERUGIKAN ? ((c.H + c.A) ? Math.round(c.H / (c.H + c.A) * 100) : null) : p;
        return { ada: true, H: c.H, S: c.S, I: c.I, A: c.A, T, efektif: h.efektif.length, pct: p, pred: pp === null ? null : predikat(pp) };
      };
      const sel = (h, key) => {
        const r = ringkas(h, key);
        if (!r.ada) return ['-', '-', '-', '-', '-', '-', '-'];
        return [r.H, r.S, r.I, r.A, r.T, r.pct === null ? '-' : r.pct + '%', r.pred === null ? '-' : r.pred + (r.T > 0 ? '*' : '')];
      };
      const kolom = n => ['H', 'S', 'I', 'A', 'T', '%', 'Predikat'].map(x => `${n} ${x}`);
      const peringatan = J.filter(h => h.ada && h.tidakTercatat.length).map(h => {
        const contoh = h.tidakTercatat.slice(0, 5).join(', ') + (h.tidakTercatat.length > 5 ? ', dst' : '');
        return `PERHATIAN Sholat ${h.nama}: ${h.tidakTercatat.length} hari ada absensi dari kelas lain tetapi kelas ${kelasTxt} tidak tercatat sama sekali (${contoh}). Bisa libur yang belum ada di Kalender Akademik, bisa juga belum diisi. Lengkapi dulu sebelum raport dicetak.`;
      }).join(' ');
      const hariTxt = J.map(h => h.ada ? `${h.nama} ${h.efektif.length} hari` : (h.tidakIkut ? `${h.nama} tidak ikut (tidak dinilai)` : `${h.nama} belum ada jenis kegiatan`)).join(', ');
      return {
        judul: `Rekap Kehadiran Sholat untuk Raport - Kelas ${kelasTxt} - Semester ${sm} ${ta}`.trim(), fileTag: `Raport_${kelasTxt}_${sm}_${ta}`, pdfFont: 6.5,
        head: ['Nama Siswa', ...kolom('Dhuha'), ...kolom('Dzuhur')],
        rows: siswaKelas.slice().sort((x, y) => COLLATOR_ID.compare(x.name, y.name)).map(st => [st.name, ...sel(J[0], st.key), ...sel(J[1], st.key)]),
        catatan: `H Hadir · S Sakit · I Izin · A Alpa · T Tidak tercatat (hari efektif kelas yang siswa itu tidak punya status; tidak dihitung ke %). % Hadir = H dibagi (H+S+I+A). ${V4_RAPORT_UDZUR_TIDAK_MERUGIKAN ? 'Predikat dihitung dari H dibagi (H+A), jadi sakit dan izin tidak menurunkan predikat ("-" = belum ada hari hadir/alpa untuk dinilai). ' : ''}Predikat: Sangat Baik ≥ ${a.sb}%, Baik ≥ ${a.b}%, Cukup ≥ ${a.c}%, selain itu Perlu Bimbingan; tanda * = ada hari tidak tercatat. Hari efektif kelas ${kelasTxt}: ${hariTxt}.${peringatan ? ' ' + peringatan : ''}`,
        peringatan, kosong: 'Tidak ada siswa di kelas ini.',
        // Bahan untuk "Terbitkan ke Portal Ortu" (v4RaportTerbitkan)
        publikasi: {
          periode: ta.replace(/[\/.#$\[\]]/g, '-') + '_' + sm, tahunAjaran: ta, semester: sm, kelas: kelasTxt, ambang: a,
          udzur: V4_RAPORT_UDZUR_TIDAK_MERUGIKAN, lengkap: !peringatan,
          items: siswaKelas.map(st => { const dh = ringkas(J[0], st.key), dz = ringkas(J[1], st.key); return { key: st.key, dhuha: dh, dzuhur: dz, deskripsi: v4RaportDeskripsi(st.name, dh, dz) }; })
        }
      };
    }
    function v4RenderRekapReligiSiswa() {
      const host = document.getElementById('v4RekapReligiSiswa');
      if (!host) return;
      if (v4RekapReligiState.view === 'petugas') { v4RenderRekapPetugas(host); return; }
      const scope = siswaScopeKelas();
      if (!scope.length) { host.innerHTML = '<div class="v4-card"><div class="v4-muted">Tidak ada kelas dalam jangkauan Anda.</div></div>'; return; }
      if (!v4RekapReligiState.kelas || !scope.includes(v4RekapReligiState.kelas)) v4RekapReligiState.kelas = scope[0];
      const now = new Date();
      if (!v4RekapReligiState.bulan) v4RekapReligiState.bulan = now.getMonth() + 1;
      if (!v4RekapReligiState.tahun) v4RekapReligiState.tahun = now.getFullYear();
      {
        // Bulan yang dibutuhkan tampilan ini: raport = seluruh bulan semester (sampai bulan ini), lainnya = bulan terpilih.
        const vwPerlu = v4RekapReligiState.view;
        let bulanPerlu;
        if (vwPerlu === 'raport' || vwPerlu === 'raportdesk') {
          const smP = v4RaportSemester(), mtP = String(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '').match(/(\d{4})\D+(\d{4})/);
          const y1P = mtP ? mtP[1] : String(now.getFullYear()), y2P = mtP ? mtP[2] : String(now.getFullYear() + 1);
          const bl = smP === 'Ganjil' ? [7, 8, 9, 10, 11, 12].map(b => y1P + '-' + String(b).padStart(2, '0')) : [1, 2, 3, 4, 5, 6].map(b => y2P + '-' + String(b).padStart(2, '0'));
          bulanPerlu = bl.filter(ym => ym <= v4ActBulanIni());
        } else {
          bulanPerlu = [v4RekapReligiState.tahun + '-' + String(v4RekapReligiState.bulan).padStart(2, '0')];
        }
        if (bulanPerlu.length && !v4ActButuhBulan(bulanPerlu, host)) return;
      }

      const dluhaTypes = v4CariJenisKegiatanSholat('Dluha').map(t => t.key);
      const dzuhurTypes = v4CariJenisKegiatanSholat('Dzuhur').map(t => t.key);
      if (!dluhaTypes.length && !dzuhurTypes.length) {
        host.innerHTML = '<div class="v4-card"><div class="v4-muted">Jenis kegiatan Sholat Dhuha/Dzuhur belum dibuat di atas, rekap belum bisa ditampilkan.</div></div>';
        return;
      }

      const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const bulanOptions = namaBulan.map((n,i) => `<option value="${i+1}" ${v4RekapReligiState.bulan===i+1?'selected':''}>${n}</option>`).join('');
      const tahunSekarang = now.getFullYear();
      const tahunOptions = [tahunSekarang-1, tahunSekarang, tahunSekarang+1].map(t => `<option value="${t}" ${v4RekapReligiState.tahun===t?'selected':''}>${t}</option>`).join('');
      const kelasOptions = scope.map(k => `<option value="${v4Safe(k)}" ${v4RekapReligiState.kelas===k?'selected':''}>${v4Safe(k)}</option>`).join('');

      const monthStr = String(v4RekapReligiState.bulan).padStart(2,'0');
      const inBulan = (tgl) => { if (!tgl) return false; const p = tgl.split('-'); return p[0] === String(v4RekapReligiState.tahun) && p[1] === monthStr; };
      const siswaKelas = (allSiswa || []).filter(s => s.kelas === v4RekapReligiState.kelas);
      const siswaKeyKelas = new Set(siswaKelas.map(s => s.key));
      const recsBulanIni = (V4.activityAttendance || []).filter(r => inBulan(r.tanggal) && siswaKeyKelas.has(r.studentId));

      const controlsHtml = `<div class="v4-card"><div class="amalan-filters">
        <div><label class="label">Kelas</label><select class="field" onchange="v4RekapReligiState.kelas=this.value;v4RenderRekapReligiSiswa();">${kelasOptions}</select></div>
        ${(v4RekapReligiState.view === 'raport' || v4RekapReligiState.view === 'raportdesk') ? v4RaportFilterHtml() : `<div><label class="label">Bulan</label><select class="field" onchange="v4RekapReligiState.bulan=Number(this.value);v4RenderRekapReligiSiswa();">${bulanOptions}</select></div>
        <div><label class="label">Tahun</label><select class="field" onchange="v4RekapReligiState.tahun=Number(this.value);v4RenderRekapReligiSiswa();">${tahunOptions}</select></div>`}
      </div>
      ${v4RekapReligiState.view === 'alpa' ? `<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><label class="label" style="margin:0;">Alpa minimal</label><select class="field" style="max-width:110px;" onchange="v4RekapReligiState.alpaMin=Number(this.value);v4RenderRekapReligiSiswa();">${[1,2,3,4,5,7,10].map(n => `<option value="${n}" ${(v4RekapReligiState.alpaMin||3)===n?'selected':''}>${n} kali</option>`).join('')}</select></div>` : ''}
      ${v4RekapReligiTabsHtml()}
      </div>`;

      // ---- Susun tabel SEKALI (dipakai untuk tampilan layar DAN ekspor Excel/PDF) ----
      const vw = v4RekapReligiState.view;
      const kelasTxt = v4RekapReligiState.kelas, bulanTxt = namaBulan[v4RekapReligiState.bulan - 1], tahunTxt = v4RekapReligiState.tahun;
      const hitung = recs => { const c = { H:0, S:0, I:0, A:0, total:0 }; recs.forEach(r => { const k = v4NormStatusKegiatan(r.status); if (k) { c[k]++; c.total++; } }); return c; };
      const persen = c => c.total ? Math.round(c.H / c.total * 100) + '%' : '-';
      const sel = c => [c.H, c.S, c.I, c.A, persen(c)];
      const headStatus = ['Dhuha H','Dhuha S','Dhuha I','Dhuha A','Dhuha %','Dzuhur H','Dzuhur S','Dzuhur I','Dzuhur A','Dzuhur %'];
      const dl = recs => recs.filter(r => dluhaTypes.includes(r.activityTypeId));
      const dz = recs => recs.filter(r => dzuhurTypes.includes(r.activityTypeId));
      const catStatus = 'H Hadir · S Sakit · I Izin · A Alpa.';
      let tabel;
      if (vw === 'alpa') {
        const min = v4RekapReligiState.alpaMin || 3;
        const rowsA = [];
        siswaKelas.forEach(sw => {
          const semuaRec = recsBulanIni.filter(r => r.studentId === sw.key);
          const rs = semuaRec.filter(r => v4NormStatusKegiatan(r.status) === 'A');
          const aDl = dl(rs).length, aDz = dz(rs).length, tot = aDl + aDz;
          if (tot < min) return;
          const tglA = [...new Set(rs.map(r => r.tanggal))].sort().map(t => {
            const rt = rs.filter(r => r.tanggal === t), d1 = dl(rt).length > 0, d2 = dz(rt).length > 0;
            return t.slice(8) + (d1 && d2 ? ' (Dh+Dz)' : d1 ? ' (Dh)' : ' (Dz)');
          }).join(', ');
          rowsA.push([sw.name, aDl, aDz, tot, persen(hitung(semuaRec)), tglA]);
        });
        rowsA.sort((a, b) => b[3] - a[3] || COLLATOR_ID.compare(a[0], b[0]));
        tabel = {
          judul: `Siswa Sering Alpa Sholat (minimal ${min} kali) - Kelas ${kelasTxt} - ${bulanTxt} ${tahunTxt}`, fileTag: `SeringAlpa_${kelasTxt}_${bulanTxt}_${tahunTxt}`,
          head: ['Nama Siswa', 'Alpa Dhuha', 'Alpa Dzuhur', 'Total Alpa', '% Hadir', 'Tanggal Alpa'], rows: rowsA,
          catatan: 'Dh = Dhuha, Dz = Dzuhur.',
          kosong: `Tidak ada siswa dengan alpa minimal ${min} kali pada kelas dan bulan ini.`
        };
      } else if (vw === 'raport') {
        tabel = v4RaportTabel(kelasTxt, siswaKelas, dluhaTypes, dzuhurTypes);
      } else if (vw === 'raportdesk') {
        tabel = v4RaportDeskTabel(kelasTxt, siswaKelas, dluhaTypes, dzuhurTypes);
      } else if (vw === 'siswa') {
        tabel = {

          judul: `Rekap Sholat Dhuha dan Dzuhur - Per Siswa - Kelas ${kelasTxt} - ${bulanTxt} ${tahunTxt}`, fileTag: `PerSiswa_${kelasTxt}_${bulanTxt}_${tahunTxt}`,
          head: ['Nama Siswa', ...headStatus], catatan: catStatus, kosong: 'Tidak ada siswa di kelas ini.',
          rows: siswaKelas.slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name)).map(st => { const rs = recsBulanIni.filter(r => r.studentId === st.key); return [st.name, ...sel(hitung(dl(rs))), ...sel(hitung(dz(rs)))]; })
        };
      } else if (vw === 'pj') {
        // Kepatuhan PJ: tiap hari sholat yang berlaku, apakah absensi siswa kelas ini sudah diisi & oleh siapa.
        const hariIni = tglLokal(), jmlSiswa = siswaKelas.length;
        const allMonth = (V4.activityAttendance || []).filter(r => r.status && inBulan(r.tanggal));
        const jenis = [{ keys: dluhaTypes, jenis: 'sholat_dluha' }, { keys: dzuhurTypes, jenis: 'sholat_dzuhur' }];
        const belum = [0, 0], rows = [];
        const lastDay = new Date(v4RekapReligiState.tahun, v4RekapReligiState.bulan, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
          const tgl = `${v4RekapReligiState.tahun}-${monthStr}-${String(d).padStart(2,'0')}`;
          if (tgl > hariIni) break;
          const row = [tgl];
          jenis.forEach((j, idx) => {
            if (!j.keys.length || !v4HariDiizinkanSholat(j.jenis, tgl)) { row.push('-'); return; }
            if (j.keys.every(tk => v4ActKelasTidakIkut(tk, kelasTxt))) { row.push('-'); return; }   // kelas ini tidak ikut kegiatan itu
            const sekolah = allMonth.filter(r => j.keys.includes(r.activityTypeId) && r.tanggal === tgl);
            if (!sekolah.length) { row.push('Tidak ada data sekolah (libur?)'); return; }
            const kls = sekolah.filter(r => siswaKeyKelas.has(r.studentId));
            if (!kls.length) { belum[idx]++; row.push('BELUM DIISI'); return; }
            const oleh = [...new Set(kls.map(r => r.recordedBy).filter(Boolean))].join(', ') || '-';
            row.push(`Terisi ${kls.length}/${jmlSiswa} siswa - ${oleh}`);
          });
          if (row.slice(1).some(x => x !== '-')) rows.push(row);
        }
        tabel = {
          judul: `Kepatuhan PJ Absensi Siswa Sholat - Kelas ${kelasTxt} - ${bulanTxt} ${tahunTxt}`, fileTag: `KepatuhanPJ_${kelasTxt}_${bulanTxt}_${tahunTxt}`,
          head: ['Tanggal', 'Sholat Dhuha', 'Sholat Dzuhur'], rows,
          catatan: `Belum diisi: Dhuha ${belum[0]}, Dzuhur ${belum[1]}. "Tidak ada data sekolah" = kemungkinan libur.` + [['Dhuha', dluhaTypes], ['Dzuhur', dzuhurTypes]].filter(([, ks]) => ks.length && ks.every(tk => v4ActKelasTidakIkut(tk, kelasTxt))).map(([n]) => ` Kelas ${kelasTxt} tidak ikut Sholat ${n} (tanda "-").`).join(''),
          kosong: 'Belum ada hari sholat yang bisa dinilai pada bulan ini.'
        };
      } else {
        const tanggalSet = [...new Set(recsBulanIni.filter(r => r.status).map(r => r.tanggal))].sort();
        tabel = {
          judul: `Rekap Sholat Dhuha dan Dzuhur - Per Hari - Kelas ${kelasTxt} - ${bulanTxt} ${tahunTxt}`, fileTag: `PerHari_${kelasTxt}_${bulanTxt}_${tahunTxt}`,
          head: ['Tanggal', ...headStatus], catatan: catStatus, kosong: 'Belum ada data absensi sholat untuk kelas & bulan ini.',
          rows: tanggalSet.map(tgl => { const rt = recsBulanIni.filter(r => r.tanggal === tgl); return [tgl, ...sel(hitung(dl(rt))), ...sel(hitung(dz(rt)))]; })
        };
      }
      v4RekapReligiLast = tabel;
      const bodyHtml = v4RekapReligiTabelHtml(tabel);
      host.innerHTML = controlsHtml + bodyHtml;
    }

// ---------- Panel isi absensi ----------
function v4ActExistingMap(typeKey, dateVal) {
  const m = {};
  (V4.activityAttendance || []).forEach(r => { if (r.activityTypeId === typeKey && r.tanggal === dateVal) m[r.studentId] = r; });
  // Perubahan yang masih di antrean offline (belum terkirim) tampil sebagai data tersimpan, supaya tidak hilang dari layar
  // (mis. setelah "Segarkan" yang memuat ulang data server) dan tidak dihitung ulang sebagai perubahan.
  Object.keys(v4ActAntrean).forEach(id => {
    const q = v4ActAntrean[id];
    if (!q || q.tk !== typeKey || q.tgl !== dateVal) return;
    if (q.rec) m[q.sid] = Object.assign({ key: id }, q.rec); else delete m[q.sid];
  });
  return m;
}
// Pilihan kelas "Semua Kelas" (nilai '*'): siswa semua kelas ditampilkan sekaligus, dikelompokkan per kelas sesuai urutan KELAS_LIST.
const V4_ACT_SEMUA_KELAS = '*';
// Kembalikan { siap, muat, total, grup:[{kelas, siswa}], siswa:[...], gagal:[kelas yang gagal dimuat] }. 'siap' = semua kelas yang diminta sudah ada di cache.
// 'type' (opsional): untuk "Semua Kelas", kelas yang tidak ikut kegiatan itu dilewati (lihat v4ActKelasAktif).
function v4ActSiswaKelas(kelasVal, type) {
  const urut = arr => arr.slice().sort((a, b) => COLLATOR_ID.compare(a.name, b.name));
  if (kelasVal !== V4_ACT_SEMUA_KELAS) {
    const arr = v4PanelSiswaCache[kelasVal];
    if (!arr) return { siap: false, muat: 0, total: 1, grup: [], siswa: [] };
    const s = urut(arr);
    return { siap: true, muat: 1, total: 1, grup: [{ kelas: kelasVal, siswa: s }], siswa: s };
  }
  const grup = [], semua = [], gagal = [];
  const kelasList = type ? v4ActKelasAktif(type) : KELAS_LIST;
  let muat = 0;
  kelasList.forEach(k => {
    const arr = v4PanelSiswaCache[k];
    // Kelas kosong (0 siswa) TETAP tercache sebagai [] oleh v4FetchSiswaByKelas; yang belum ada di cache hanya yang
    // masih memuat atau GAGAL (error/timeout, dicatat di v4PanelSiswaGagal).
    if (!arr) { if (typeof v4PanelSiswaGagal !== 'undefined' && v4PanelSiswaGagal[k]) gagal.push(k); return; }
    muat++;
    const s = urut(arr).map(st => st.kelas ? st : Object.assign({}, st, { kelas: k })); // pastikan record tersimpan membawa kelas
    grup.push({ kelas: k, siswa: s });
    s.forEach(st => semua.push(st));
  });
  return { siap: muat === kelasList.length, muat, total: kelasList.length, grup, siswa: semua, gagal };
}
// Jumlah siswa yang statusnya di draft BERBEDA dari data tersimpan (perubahan yang benar-benar belum disimpan).
// Biaya utamanya bukan memeriksa draft (≤ jumlah siswa kelas), tapi v4ActExistingMap yang memindai SELURUH absensi tahun ajaran.
// Jadi: draft kosong -> langsung 0 tanpa memindai; pemanggil yang sudah punya map-nya (render panel) menyerahkannya agar tidak memindai dua kali.
function v4ActDirtyCount(typeKey, exMap) {
  const draft = v4ActDraftOf(typeKey);
  const keys = Object.keys(draft);
  if (keys.length === 0) return 0;
  const dateVal = v4ActDateSel[typeKey] || v4Date();
  const ex = exMap || v4ActExistingMap(typeKey, dateVal);
  return keys.filter(sk => {
    const d = draft[sk] || {};
    return (d.status || null) !== (v4NormStatusKegiatan((ex[sk] || {}).status) || null);
  }).length;
}
// FIX: ganti tanggal/kelas/tutup panel dulu membuang draft diam-diam. Sekarang ada konfirmasi kalau ada perubahan.
function v4ActLepasDraft(typeKey) {
  if (!typeKey || v4ActDirtyCount(typeKey) === 0) return true;
  return confirm('Ada perubahan absensi yang belum disimpan. Lanjutkan dan buang perubahan tersebut?');
}
function v4ToggleActivityFill(typeKey) {
  const lama = v4ActOpenTypeKey; // panel yang sedang terbuka (akan ditutup)
  if (lama && !v4ActLepasDraft(lama)) return;
  // Buang HANYA draft panel yang ditutup (sudah dikonfirmasi di atas), bukan draft kegiatan lain.
  if (lama) delete v4ActAttendanceDraft[lama];
  if (lama === typeKey) { v4ActOpenTypeKey = null; }
  else {
    v4ActOpenTypeKey = typeKey;
    delete v4ActAttendanceDraft[typeKey]; // panel yang dibuka mulai dari draft kosong
    if (!v4ActKelasSel[typeKey]) v4ActKelasSel[typeKey] = '';
  }
  v4RenderActivityFill();
}
function v4RenderActivityFillPanel(type) {
  const dateVal = v4ActDateSel[type.key] || v4Date();
  const kelasVal = v4ActKelasSel[type.key] || '';
  const k = escapeJs(type.key);
  const kelasOptions = `<option value="${V4_ACT_SEMUA_KELAS}" ${kelasVal === V4_ACT_SEMUA_KELAS ? 'selected' : ''}>📚 Semua Kelas</option>` +
    KELAS_LIST.map(x => `<option value="${escapeHtml(x)}" ${kelasVal === x ? 'selected' : ''}>${escapeHtml(x)}${v4ActKelasTidakIkut(type, x) ? ' (tidak ikut)' : ''}</option>`).join('');
  if (!kelasVal) {
    return `<div class="border-muted" style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;">
      <label class="label">Pilih kelas untuk mulai mengisi</label>
      <select class="field" style="max-width:220px;" onchange="v4SetActivityKelas('${k}', this.value)"><option value="">-- Pilih Kelas --</option>${kelasOptions}</select>
    </div>`;
  }
  const dat = v4ActSiswaKelas(kelasVal, type);
  const semua = kelasVal === V4_ACT_SEMUA_KELAS;
  if (!dat.siap) {
    if (semua && dat.gagal && dat.gagal.length) {
      // FIX: dulu satu kelas yang gagal dimuat membuat mode Semua Kelas tampak "Memuat (x/y)" selamanya tanpa pesan apa pun.
      const alasan = dat.gagal.map(kg => `${v4Safe(kg)}: ${v4Safe(v4PanelSiswaGagal[kg])}`).join('; ');
      return `<div style="margin-top:10px;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;">⚠️ Gagal memuat siswa kelas ${dat.gagal.map(v4Safe).join(', ')} (${alasan}). Dimuat ${dat.muat}/${dat.total} kelas. <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-left:6px;" onclick="v4SetActivityKelas('${k}','${V4_ACT_SEMUA_KELAS}')">🔄 Coba lagi</button></div>`;
    }
    if (semua) {
      return `<div class="v4-muted" style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;">⏳ Memuat data siswa semua kelas (${dat.muat}/${dat.total})... <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" onclick="v4SetActivityKelas('${k}','${V4_ACT_SEMUA_KELAS}')">Coba lagi</button></div>`;
    }
    return v4PanelSiswaMemuatHtml(kelasVal, `v4SetActivityKelas('${k}','${escapeJs(kelasVal)}')`, 'margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;');
  }
  const siswa = dat.siswa;
  // FIX: dideklarasikan sebelum terisiDi/judulKelas yang memakainya (hindari TDZ)
  const existingMap = v4ActExistingMap(type.key, dateVal);
  const terisiDi = s => !!v4NormStatusKegiatan((v4ActDraftOf(type.key)[s.key] || existingMap[s.key] || {}).status);
  const judulKelas = g => `Kelas ${v4Safe(g.kelas)} · ${g.siswa.length} siswa · ${g.siswa.filter(terisiDi).length}/${g.siswa.length} terisi`;
  const grupTampil = semua ? dat.grup.filter(g => g.siswa.length) : dat.grup; // mode semua: lewati kelas kosong
  const barisSiswa = s => {
    const draft = v4ActDraftOf(type.key)[s.key] || existingMap[s.key] || {};
    const cur = v4NormStatusKegiatan(draft.status);
    const statusBtns = ['H', 'S', 'I', 'A'].map(st => `<button class="status-choice ${cur === st ? 'selected' : ''}" data-status="${st}" onclick="v4SetActivityField('${k}','${escapeJs(s.key)}','${st}')">${st}</button>`).join('');
    return `<tr><td style="font-weight:600;white-space:nowrap;">${v4Safe(s.name)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap;">${statusBtns}</div></td></tr>`;
  };
  let rows = grupTampil.map(g => (semua ? `<tr><td colspan="2" style="background:#eef2ff;font-weight:700;font-size:12px;padding:6px 8px;">${judulKelas(g)}</td></tr>` : '') + g.siswa.map(barisSiswa).join('')).join('');
  if (siswa.length === 0) rows = `<tr><td colspan="2" class="text-muted" style="text-align:center;padding:12px;">Belum ada siswa di kelas ini.</td></tr>`;
  // MODE CEPAT: ketuk nama = ganti status H -> A -> S -> I -> H. Cocok untuk kelas yang hampir semuanya hadir.
  const fast = v4ActFastMode[type.key] !== false && siswa.length > 0; // DEFAULT Mode Cepat; Mode Tabel hanya bila dipilih manual
  let listHtml;
  if (fast) {
    const warna = { H: ['#dcfce7', '#86efac', '#166534'], A: ['#fee2e2', '#fca5a5', '#991b1b'], S: ['#fef9c3', '#fde047', '#854d0e'], I: ['#dbeafe', '#93c5fd', '#1e40af'] };
    const label = { H: 'Hadir', A: 'Alpa', S: 'Sakit', I: 'Izin' };
    const cnt = { H: 0, A: 0, S: 0, I: 0, kosong: 0 };
    const chip = s => {
      const st = v4NormStatusKegiatan((v4ActDraftOf(type.key)[s.key] || existingMap[s.key] || {}).status);
      const c = warna[st]; if (c) cnt[st]++; else cnt.kosong++;
      const [bg, bd, fg] = c || ['#f3f4f6', '#d1d5db', '#374151'];
      return `<button type="button" onclick="v4CycleActivityStatus('${k}','${escapeJs(s.key)}')" style="display:flex;align-items:center;justify-content:space-between;gap:6px;text-align:left;min-height:34px;padding:3px 8px;border-radius:8px;border:1.5px solid ${bd};background:${bg};color:${fg};cursor:pointer;font-size:12px;line-height:1.2;"><strong style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${v4Safe(s.name)}</strong><span style="font-size:11px;font-weight:700;flex:none;">${st ? st : '·'}</span></button>`;
    };
    const chips = grupTampil.map(g => (semua ? `<div style="grid-column:1/-1;font-weight:700;font-size:12px;margin-top:6px;color:#3730a3;">${judulKelas(g)}</div>` : '') + g.siswa.map(chip).join('')).join('');
    listHtml = `<div class="amalan-isi-ringkas" style="font-size:12px;margin-bottom:6px;color:#374151;">✅ Hadir ${cnt.H} · ❌ Alpa ${cnt.A} · 🤒 Sakit ${cnt.S} · 📝 Izin ${cnt.I}${cnt.kosong ? ` · ⬜ Belum ${cnt.kosong}` : ''}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;">${chips}</div>`;
  } else {
    listHtml = `<div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>Kehadiran</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  const dirty = v4ActDirtyCount(type.key, existingMap);
  const nAntrean = v4ActAntreanJumlah(), nCi = v4ActCiTundaJumlah(), offline = !navigator.onLine;
  const bannerAntrean = (nAntrean || nCi || offline) ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">${offline ? '📡 Offline: absensi akan disimpan di perangkat dan dikirim otomatis saat online.' : ''}${nAntrean ? `${offline ? '<br>' : ''}⏳ ${nAntrean} perubahan absensi menunggu dikirim ke server. <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" onclick="v4ActAntreanKirim(true)">Kirim sekarang</button>${v4ActAntreanErr ? ` <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="v4ActAntreanBuang()">Buang antrean</button><br><span style="color:#b91c1c;">Terakhir gagal: ${v4Safe(v4ActAntreanErr)}</span>` : ''}` : ''}${nCi ? `${(offline || nAntrean) ? '<br>' : ''}⏳ ${nCi} check-in petugas menunggu dikirim. <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" onclick="v4ActCiTundaKirim(true)">Kirim sekarang</button>` : ''}</div>` : '';
  return `<div style="margin-top:10px;">
    ${bannerAntrean}
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
      <label class="label" style="margin:0;">Tanggal:</label>
      <input type="date" class="field" style="max-width:150px;" value="${v4Safe(dateVal)}" max="${v4Safe(v4Date())}" onchange="v4SetActivityDate('${k}', this.value)">
      <label class="label" style="margin:0;">Kelas:</label>
      <select class="field" style="max-width:170px;" onchange="v4SetActivityKelas('${k}', this.value)"><option value="">-- Pilih Kelas --</option>${kelasOptions}</select>
      <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" title="Muat ulang data dari server (lihat isian guru lain)" onclick="v4LoadCore()">🔄 Segarkan</button>
    </div>
    ${siswa.length > 0 ? `<div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;"><button class="btn ${fast ? 'btn-success' : 'btn-soft'}" style="padding:6px 12px;font-size:12px;" onclick="v4ToggleActivityFast('${k}')">${fast ? '⚡ Mode Cepat (aktif) · ketuk untuk ganti ke Tabel' : '📋 Mode Tabel · ketuk untuk ganti ke Mode Cepat'}</button><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" onclick="v4FillAllActivityHadir('${k}')">✅ Isi Semua Hadir (yang belum diisi)</button></div>` : ''}
    ${listHtml}
    ${siswa.length > 0 ? `<button id="btnSaveV4Act_${v4Safe(type.key)}" class="btn btn-success" style="margin-top:10px;" onclick="v4SaveActivityAttendance('${k}')">💾 Simpan${offline ? ' Offline' : ''} Absensi (${semua ? 'Semua Kelas' : v4Safe(kelasVal)})${dirty ? ` · ${dirty} perubahan` : ''}</button>` : ''}
  </div>`;
}
function v4SetActivityDate(typeKey, date) {
  const baru = date || v4Date();
  if (baru > v4Date()) { toast('Tanggal absensi tidak boleh di masa depan.', true); v4RenderActivityFill(); return; }
  if (baru === (v4ActDateSel[typeKey] || v4Date())) return;
  if (!v4ActLepasDraft(typeKey)) { v4RenderActivityFill(); return; } // kembalikan nilai input tanggal
  v4ActDateSel[typeKey] = baru;
  delete v4ActAttendanceDraft[typeKey];
  if (baru !== v4Date()) v4ActLoadCheckins(baru);
  // Absensi dimuat per bulan: tanggal di bulan lain perlu dimuat dulu supaya isian yang sudah ada tampil.
  if (!v4ActSiap([baru.slice(0, 7)])) v4ActPastikan([baru.slice(0, 7)]).then(() => { if (v4ActDateSel[typeKey] === baru) v4RenderActivityFill(); });
  v4RenderActivityFill();
}
function v4SetActivityKelas(typeKey, kelas) {
  const sama = (v4ActKelasSel[typeKey] || '') === (kelas || '');
  // Tombol "Coba lagi" memanggil fungsi ini dengan kelas yang sama -> jangan minta konfirmasi / buang draft.
  if (!sama && !v4ActLepasDraft(typeKey)) { v4RenderActivityFill(); return; }
  v4ActKelasSel[typeKey] = kelas;
  if (!sama) delete v4ActAttendanceDraft[typeKey];
  if (!kelas) { v4RenderActivityFill(); return; }
  // Render pertama = status "memuat"; render kedua setelah data datang. Cache siswa dibagi per KELAS (bukan per
  // kegiatan), jadi yang menentukan adalah panel yang terbuka SAAT callback datang: render kalau panel itu sedang
  // menampilkan kelas yang baru dimuat (bisa kegiatan lain dari yang memulai fetch). Selain itu lewati.
  const sesudahMuat = k => {
    const buka = v4ActOpenTypeKey, sel = buka ? (v4ActKelasSel[buka] || '') : '';
    if (buka && (sel === k || sel === V4_ACT_SEMUA_KELAS)) v4RenderActivityFill();
  };
  if (kelas === V4_ACT_SEMUA_KELAS) {
    // Muat semua kelas yang belum ada di cache; tiap kelas yang selesai memperbarui progres "(x/y)".
    v4ActKelasAktif(v4ActTypeByKey(typeKey)).forEach(k => { if (!v4PanelSiswaCache[k]) v4FetchSiswaByKelas(k, () => sesudahMuat(k)); });
  } else {
    v4FetchSiswaByKelas(kelas, () => sesudahMuat(kelas));
  }
  v4RenderActivityFill();
}
// Ganti tampilan Mode Cepat <-> Mode Tabel. Mode Cepat adalah DEFAULT. Beralih mode TIDAK mengubah isian apa pun;
// tombol "Isi Semua Hadir" (v4FillAllActivityHadir) yang menandai siswa belum terisi sebagai Hadir.
function v4ToggleActivityFast(typeKey) {
  v4ActFastMode[typeKey] = (v4ActFastMode[typeKey] === false);
  v4RenderActivityFill();
}
function v4CycleActivityStatus(typeKey, studentKey) {
  if (v4ActOpenTypeKey !== typeKey) return; // guard: hanya panel yang terbuka yang boleh mengubah draft
  const dateVal = v4ActDateSel[typeKey] || v4Date();
  const existing = v4ActExistingMap(typeKey, dateVal)[studentKey] || {};
  const cur = v4NormStatusKegiatan((v4ActDraftOf(typeKey)[studentKey] || existing || {}).status);
  const next = { H: 'A', A: 'S', S: 'I', I: 'H' }[cur] || 'H';
  v4ActDraftW(typeKey)[studentKey] = { status: next };
  v4RenderActivityFill();
}
function v4FillAllActivityHadir(typeKey) {
  if (v4ActOpenTypeKey !== typeKey) return; // guard: hanya panel yang terbuka yang boleh mengubah draft
  const kelasVal = v4ActKelasSel[typeKey] || '', dateVal = v4ActDateSel[typeKey] || v4Date();
  const dat = v4ActSiswaKelas(kelasVal, v4ActTypeByKey(typeKey));
  const siswa = dat.siap ? dat.siswa : [];
  if (!siswa.length) return toast('Belum ada siswa di kelas ini.', true);
  const existing = v4ActExistingMap(typeKey, dateVal);
  const belum = siswa.filter(st => !v4NormStatusKegiatan((v4ActDraftOf(typeKey)[st.key] || existing[st.key] || {}).status));
  // Mode Semua Kelas menyentuh banyak siswa sekaligus: minta konfirmasi supaya tidak tertandai Hadir tanpa sengaja.
  if (belum.length && kelasVal === V4_ACT_SEMUA_KELAS && !confirm('Tandai ' + belum.length + ' siswa yang belum diisi dari SEMUA kelas sebagai Hadir?')) { v4RenderActivityFill(); return; }
  belum.forEach(st => { v4ActDraftW(typeKey)[st.key] = { status: 'H' }; });
  const n = belum.length;
  toast(n ? `✅ ${n} siswa ditandai Hadir. Ubah yang tidak hadir, lalu Simpan.` : 'Semua siswa sudah terisi.', false, 2500);
  v4RenderActivityFill();
}
function v4SetActivityField(typeKey, studentKey, status) {
  if (v4ActOpenTypeKey !== typeKey) return; // guard: hanya panel yang sedang terbuka yang boleh mengubah draft
  const draft = v4ActDraftW(typeKey);
  if (!draft[studentKey]) {
    const dateVal = v4ActDateSel[typeKey] || v4Date();
    const existing = v4ActExistingMap(typeKey, dateVal)[studentKey] || {};
    draft[studentKey] = { status: v4NormStatusKegiatan(existing.status) || null };
  }
  draft[studentKey].status = (draft[studentKey].status === status) ? null : status;
  v4RenderActivityFill();
}

// ---------- Antrean offline absensi kegiatan ----------
// Saat offline (atau server tidak merespons dalam V4_ACT_SIMPAN_TIMEOUT_MS), perubahan absensi disimpan di localStorage
// (bertahan walau aplikasi ditutup) lalu dikirim otomatis saat online. Aman dikirim ulang: key record DETERMINISTIK
// (`typeKey_tanggal_studentKey`) dan update() menimpa path yang sama, jadi tidak pernah menggandakan data.
// Catatan: kalau dua perangkat mengubah siswa yang sama saat offline, yang terkirim terakhir menang (last-write-wins).
const V4_ACT_ANTREAN_KEY = 'simamba_act_antrean_v1';
const V4_ACT_SIMPAN_TIMEOUT_MS = 15000;
const V4_ACT_KIRIM_PER_BATCH = 200;
let v4ActAntrean = v4ActAntreanBaca();   // recordId -> { tk, tgl, sid, rec (objek | null = hapus), tok }
let v4ActAntreanJalan = false, v4ActAntreanErr = '';
function v4ActAntreanBaca() {
  try { const o = JSON.parse(localStorage.getItem(V4_ACT_ANTREAN_KEY) || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; }
}
function v4ActAntreanSimpan() {
  try {
    if (Object.keys(v4ActAntrean).length) localStorage.setItem(V4_ACT_ANTREAN_KEY, JSON.stringify(v4ActAntrean)); else localStorage.removeItem(V4_ACT_ANTREAN_KEY);
    return true;
  } catch (e) { console.warn('[SI MAMBA] antrean offline gagal disimpan:', e); return false; }
}
function v4ActAntreanJumlah() { return Object.keys(v4ActAntrean).length; }
// Kembalikan { recordId: token } kalau berhasil disimpan ke perangkat, null kalau gagal (penyimpanan penuh/diblokir).
function v4ActAntreanTambah(typeKey, dateVal, touched, records) {
  const sebelum = Object.assign({}, v4ActAntrean), toks = {};
  touched.forEach(st => {
    const id = `${typeKey}_${dateVal}_${st.key}`, tok = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    v4ActAntrean[id] = { tk: typeKey, tgl: dateVal, sid: st.key, rec: records[id], tok };
    toks[id] = tok;
  });
  if (!v4ActAntreanSimpan()) { v4ActAntrean = sebelum; return null; }
  return toks;
}
// Hapus entri antrean HANYA kalau tokennya masih sama (entri yang sudah ditimpa perubahan lebih baru tidak ikut terhapus).
function v4ActAntreanHapusToks(toks) {
  if (!toks) return;
  Object.keys(toks).forEach(id => { if (v4ActAntrean[id] && v4ActAntrean[id].tok === toks[id]) delete v4ActAntrean[id]; });
  v4ActAntreanSimpan();
  v4ActAntreanUI();
}
function v4ActAntreanUI() { try { v4RenderActivityFill(); } catch (e) { /* halaman belum siap */ } }
// Salin ke V4.activityAttendance (salinan lokal) -- items: [{ id, tk, tgl, sid, rec }]
function v4ActTerapkanKeV4(items) {
  if (!Array.isArray(V4.activityAttendance)) V4.activityAttendance = [];
  items.forEach(q => {
    if (!q.rec) { V4.activityAttendance = V4.activityAttendance.filter(r => !(r.activityTypeId === q.tk && r.studentId === q.sid && r.tanggal === q.tgl)); return; }
    const rec = Object.assign({ key: q.id }, q.rec);
    const i = V4.activityAttendance.findIndex(r => r.activityTypeId === q.tk && r.studentId === rec.studentId && r.tanggal === q.tgl);
    if (i >= 0) V4.activityAttendance[i] = rec; else V4.activityAttendance.push(rec);
  });
}
// Perbarui salinan lokal + buang draft yang sudah tersimpan + render. Dipakai setelah server konfirmasi ATAU setelah masuk antrean.
function v4ActSelesaiLokal(typeKey, kelasVal, dateVal, touched, records, snap) {
  // Iterasi `touched` (bukan Object.keys(records) + id.slice): id siswa diambil langsung dari objek siswa, tanpa parsing string.
  v4ActTerapkanKeV4(touched.map(st => { const id = `${typeKey}_${dateVal}_${st.key}`; return { id, tk: typeKey, tgl: dateVal, sid: st.key, rec: records[id] }; }));
  // Buang draft hanya untuk entri yang tersimpan DAN belum berubah sejak snapshot, dan hanya kalau panel masih
  // menampilkan kelas+tanggal yang sama (ketukan selama menunggu konfirmasi server tidak ikut hilang).
  const sameContext = v4ActOpenTypeKey === typeKey && (v4ActKelasSel[typeKey] || '') === kelasVal && (v4ActDateSel[typeKey] || v4Date()) === dateVal;
  if (sameContext) {
    const dr = v4ActDraftOf(typeKey);
    touched.forEach(st => { const d = dr[st.key]; if (d && (d.status || null) === snap[st.key]) delete dr[st.key]; });
    v4ActDraftPrune(typeKey);
  }
  v4ActPersistCache();
  v4RenderActivities();
}
// Kirim antrean ke server. manual=true (tombol "Kirim sekarang") menampilkan toast untuk setiap hasil; otomatis hanya saat berhasil.
function v4ActAntreanKirim(manual) {
  if (v4ActAntreanJalan) { if (manual) toast('⏳ Sedang mengirim antrean...', false, 1500); return; }
  if (!v4ActAntreanJumlah()) { if (manual) toast('Tidak ada antrean yang perlu dikirim.', false, 1500); return; }
  if (typeof currentUser === 'undefined' || !currentUser || typeof db === 'undefined') return; // belum login: tunggu
  if (!navigator.onLine) { if (manual) toast('📡 Masih offline. Antrean dikirim otomatis saat koneksi kembali.', true); return; }
  v4ActAntreanJalan = true;
  const ids = Object.keys(v4ActAntrean).slice(0, V4_ACT_KIRIM_PER_BATCH);
  const items = ids.map(id => Object.assign({ id }, v4ActAntrean[id])), payload = {};
  items.forEach(q => { payload[q.id] = q.rec; });
  let selesai = false;
  const tmo = setTimeout(() => {
    if (selesai) return; selesai = true; v4ActAntreanJalan = false;
    v4ActAntreanErr = 'Server belum merespons (sinyal lemah?). Dicoba lagi otomatis.';
    if (manual) toast('⏳ Server belum merespons. Antrean tetap tersimpan dan dicoba lagi otomatis.', true);
    v4ActAntreanUI();
  }, V4_ACT_SIMPAN_TIMEOUT_MS);
  db.ref('activity_attendance_v4').update(payload).then(() => {
    clearTimeout(tmo); selesai = true; v4ActAntreanJalan = false; v4ActAntreanErr = '';
    const toks = {}; items.forEach(q => { toks[q.id] = q.tok; });
    v4ActAntreanHapusToks(toks);
    v4ActTerapkanKeV4(items);   // jaga salinan lokal tetap benar walau data sempat dimuat ulang dari server
    const per = {}; items.forEach(q => { per[q.tk] = (per[q.tk] || 0) + 1; });
    Object.keys(per).forEach(tk => v4Audit('SYNC_ACTIVITY_ATTENDANCE', 'ACTIVITY_TYPE', tk, null, { jumlah: per[tk], dariAntreanOffline: true }));
    v4ActPersistCache();
    toast(`✅ ${items.length} perubahan absensi dari antrean offline terkirim.`, false, 3000);
    v4RenderActivities();
    if (v4ActAntreanJumlah()) setTimeout(() => v4ActAntreanKirim(false), 0); // sisa batch berikutnya
  }).catch(err => {
    clearTimeout(tmo); selesai = true; v4ActAntreanJalan = false;
    v4ActAntreanErr = (err && err.message) || String(err);
    console.error('[SI MAMBA] Gagal kirim antrean absensi kegiatan:', err);
    if (manual) toast('❌ Antrean belum terkirim: ' + v4ActAntreanErr, true);
    v4ActAntreanUI();
  });
}
// Dipakai kalau antrean macet karena ditolak server (mis. Rules) -- tidak bisa dibatalkan.
function v4ActAntreanBuang() {
  const n = v4ActAntreanJumlah(); if (!n) return;
  if (!confirm('Buang ' + n + ' perubahan absensi yang belum terkirim? Tindakan ini tidak bisa dibatalkan.')) return;
  v4ActAntrean = {}; v4ActAntreanSimpan(); v4ActAntreanErr = '';
  if (navigator.onLine && typeof v4LoadCore === 'function') v4LoadCore(); // samakan salinan lokal dengan server
  else v4RenderActivities();
}
// Pemicu otomatis: koneksi kembali, sesaat setelah aplikasi dibuka, dan berkala selama masih ada antrean.
window.addEventListener('online', () => { setTimeout(() => v4ActCiTundaKirim(false), 1000); setTimeout(() => v4ActAntreanKirim(false), 2500); v4ActAntreanUI(); });
window.addEventListener('offline', () => v4ActAntreanUI());
setTimeout(() => { v4ActCiTundaKirim(false); setTimeout(() => v4ActAntreanKirim(false), 1500); }, 8000);
setInterval(() => { if (v4ActCiTundaJumlah()) v4ActCiTundaKirim(false); if (v4ActAntreanJumlah()) v4ActAntreanKirim(false); }, 60000);

// ---------- Simpan absensi ----------
function v4SaveActivityAttendance(typeKey) {
  const type = v4ActTypeByKey(typeKey);
  if (!type) return toast('Kegiatan tidak ditemukan!', true);
  const kelasVal = v4ActKelasSel[typeKey] || '', dateVal = v4ActDateSel[typeKey] || v4Date();
  // FIX: pengecekan PJ dulu selalu memakai tanggal HARI INI, jadi pengganti "hari ini" bisa mengisi tanggal lain.
  if (!v4ActBolehIsi(type, dateVal)) return toast(dateVal === v4Date() ? 'Check-in petugas dulu (scan QR kegiatan) sebelum mengisi absensi hari ini.' : 'Hanya penanggung jawab (atau pengganti yang tercatat untuk tanggal ini) yang bisa mengisi absensi ini!', true);
  if (isBusy('v4SaveAct_' + typeKey)) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
  // Offline: write Firebase baru resolve setelah server konfirmasi (promise menggantung & tombol macet), jadi saat offline
  // perubahan masuk antrean perangkat (lihat "Antrean offline") dan dikirim otomatis saat online.
  if (dateVal > v4Date()) return toast('Tanggal absensi tidak boleh di masa depan.', true);
  const dat = v4ActSiswaKelas(kelasVal, type);
  const siswa = dat.siap ? dat.siswa : [];
  if (siswa.length === 0) return toast('Tidak ada siswa di kelas ini.', true);

  // Snapshot SEKARANG (sebelum await apa pun). Hanya siswa yang statusnya BERUBAH dari data tersimpan yang ditulis:
  // (1) anti lost-update antar-guru (PJ asli & pengganti mengisi kelas/tanggal yang sama hampir bersamaan),
  // (2) tidak menulis ulang record yang sama (hemat kuota Firebase).
  const ex = v4ActExistingMap(typeKey, dateVal);
  const snap = {};
  const draftSave = v4ActDraftOf(typeKey);
  siswa.forEach(st => { const d = draftSave[st.key]; if (d) snap[st.key] = d.status || null; });
  const touched = siswa.filter(st => Object.prototype.hasOwnProperty.call(snap, st.key) && snap[st.key] !== (v4NormStatusKegiatan((ex[st.key] || {}).status) || null));
  if (touched.length === 0) {
    delete v4ActAttendanceDraft[typeKey]; // sisa draft ternyata sama dengan data tersimpan
    v4RenderActivityFill();
    return toast('Belum ada perubahan absensi untuk disimpan.', false, 2000);
  }
  // Kelas yang ditandai tidak ikut kegiatan ini tetap boleh diisi (mis. hari khusus), tapi minta konfirmasi.
  if (kelasVal !== V4_ACT_SEMUA_KELAS && v4ActKelasTidakIkut(type, kelasVal) && !confirm(`Kelas ${kelasVal} ditandai TIDAK ikut ${type.name} (mis. pulang lebih awal). Tetap simpan absensinya?`)) return;
  // Sholat Dhuha: Senin-Sabtu, Dzuhur: Senin-Kamis. Hari lain tetap boleh, tapi minta konfirmasi (salah tanggal itu mudah terjadi).
  const jenisSholat = v4ActJenisSholat(type);
  if (jenisSholat && !v4HariDiizinkanSholat(jenisSholat, dateVal)) {
    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(dateVal + 'T00:00:00').getDay()];
    if (!confirm(`${type.name} biasanya tidak dilaksanakan pada hari ${namaHari}. Tetap simpan absensi tanggal ${dateVal}?`)) return;
  }

  const getBtn = () => document.getElementById('btnSaveV4Act_' + typeKey); // tombol bisa dirender ulang saat menunggu
  setBusy('v4SaveAct_' + typeKey, getBtn());
  const nowIso = new Date().toISOString();
  const records = {};
  try {
    touched.forEach(st => {
      // status null (pilihan dibatalkan) TIDAK boleh ditulis sebagai record -- Rules mewajibkan child 'status';
      // dikirim sebagai null = hapus record (hapus selalu lolos validasi).
      records[`${typeKey}_${dateVal}_${st.key}`] = snap[st.key] ? { activityTypeId: typeKey, studentId: st.key, studentName: st.name, kelas: st.kelas, tanggal: dateVal, status: snap[st.key], recordedBy: currentUser.name, guruKey: currentUser.key || null, recordedAt: nowIso, tahunAjaran: currentTahunAjaran } : null;
    });
  } catch (e) {
    clearBusy('v4SaveAct_' + typeKey, getBtn());
    return toast('Gagal: ' + (e && e.message || e), true);
  }
  // OFFLINE: simpan ke antrean perangkat, tampilkan sebagai tersimpan, kirim otomatis saat online.
  if (!navigator.onLine) {
    const toksOff = v4ActAntreanTambah(typeKey, dateVal, touched, records);
    clearBusy('v4SaveAct_' + typeKey, getBtn());
    if (!toksOff) return toast('❌ Gagal menyimpan ke antrean perangkat (penyimpanan penuh atau diblokir). Draft dipertahankan.', true);
    v4ActSelesaiLokal(typeKey, kelasVal, dateVal, touched, records, snap);
    return toast(`📡 Offline: ${touched.length} perubahan disimpan di perangkat dan dikirim otomatis saat online.`, false, 4000);
  }
  // ONLINE tapi sinyal lemah (navigator.onLine true, server tak merespons): setelah V4_ACT_SIMPAN_TIMEOUT_MS alihkan ke
  // antrean supaya tombol tidak macet. Kalau server akhirnya konfirmasi, entri antrean dibuang (kirim ulang pun idempoten).
  let selesai = false, toksTelat = null;
  const tmo = setTimeout(() => {
    if (selesai) return; selesai = true;
    clearBusy('v4SaveAct_' + typeKey, getBtn());
    toksTelat = v4ActAntreanTambah(typeKey, dateVal, touched, records);
    if (!toksTelat) return toast('⏳ Server belum merespons dan antrean perangkat gagal disimpan. Draft dipertahankan, coba simpan lagi.', true);
    v4ActSelesaiLokal(typeKey, kelasVal, dateVal, touched, records, snap);
    toast('📶 Sinyal lemah: absensi disimpan di perangkat dan dikirim otomatis saat server merespons.', false, 4500);
  }, V4_ACT_SIMPAN_TIMEOUT_MS);
  // Satu update() multi-path = atomik: semua tersimpan atau tidak sama sekali.
  db.ref('activity_attendance_v4').update(records).then(() => {
    clearTimeout(tmo);
    if (selesai) { v4ActAntreanHapusToks(toksTelat); return; } // sudah dialihkan ke antrean oleh timeout
    selesai = true;
    clearBusy('v4SaveAct_' + typeKey, getBtn());
    toast('✅ Absensi tersimpan!');
    v4Audit('SAVE_ACTIVITY_ATTENDANCE', 'ACTIVITY_TYPE', typeKey, null, { kelas: kelasVal, tanggal: dateVal, jumlah: touched.length });
    // Perbarui salinan lokal SEKARANG. FIX: dulu setelah ini memanggil v4LoadCore() yang mengunduh ulang ±13 dataset
    // (termasuk seluruh absensi tahun ajaran) di SETIAP simpan -- boros kuota. Salinan lokal sudah akurat; tombol
    // "🔄 Segarkan" tersedia kalau ingin melihat isian guru lain.
    v4ActSelesaiLokal(typeKey, kelasVal, dateVal, touched, records, snap);
  }).catch(err => {
    clearTimeout(tmo);
    console.error('[SI MAMBA] Gagal simpan absensi kegiatan:', err);
    if (selesai) return; // sudah di antrean: dicoba ulang otomatis oleh pengirim antrean
    selesai = true;
    clearBusy('v4SaveAct_' + typeKey, getBtn());
    toast('❌ Gagal menyimpan (tidak ada data yang tersimpan, draft dipertahankan): ' + (err && err.message || err), true);
  });
}

// ============================================================
// CHECK-IN PETUGAS HARIAN LEWAT QR (anti rebutan)
//
// Aturan:
//  1. Setiap kegiatan punya QR sendiri (dicetak Admin, dipasang di lokasi). Isi QR: SIMAMBA-KEG|<typeKey>|<qrToken>.
//  2. Absensi siswa HARI INI baru bisa diisi setelah petugas check-in (scan QR + GPS di radius madrasah).
//  3. Hanya SATU petugas per kegiatan per hari (transaction: yang pertama menang, tidak saling timpa).
//  4. PJ tetap atau pengganti yang ditunjuk Admin boleh check-in kapan saja.
//  5. Guru lain boleh KLAIM jadi pengganti hanya jika: belum ada petugas, Admin belum menunjuk pengganti,
//     dan sudah lewat (jam mulai + 15 menit). Klaim juga wajib scan QR di lokasi.
//  6. Admin/Kepala Madrasah selalu bisa mengisi dan bisa me-reset petugas hari itu.
//  7. CHECK-IN TERTUNDA: PJ / pengganti yang ditunjuk Admin boleh scan QR + GPS saat OFFLINE (atau sinyal lemah). Check-in disimpan
//     di perangkat (localStorage), absensi siswa langsung bisa diisi, dan dikirim otomatis saat online lewat transaction yang sama
//     (yang pertama sampai ke server menang). KLAIM pengganti tetap wajib online (tidak bisa dipastikan "PJ belum check-in").
//     Konsekuensi: dua orang yang check-in offline bisa bentrok -> yang kalah diberi tahu & dicatat di log; absensi siswa yang
//     sudah ia isi tetap tersimpan (perlu diperiksa Admin). Jam offline memakai jam perangkat (ditandai "offline" di kartu).
// Catatan keamanan: aplikasi ini berjalan di sisi klien, jadi QR + GPS mencegah rebutan dan lalai,
// bukan kecurangan yang disengaja. Kalau QR bocor, Admin tekan "Ganti Kode" lalu cetak ulang.
// Data: activity_checkin_v4/<tanggal>_<typeKey> (satu catatan per kegiatan per hari).
// ============================================================
const V4_ACT_GRACE_MENIT = 15;
const V4_ACT_JAM_DEFAULT = '07:00';
let v4ActCheckins = {};        // '<tanggal>_<typeKey>' -> catatan check-in
let v4ActCheckinWatch = {};    // tanggal -> query Firebase yang sedang didengarkan (hanya hari ini)
let v4ActEpoch = 0;            // naik setiap logout/reset: callback Firebase dari sesi lama diabaikan
let v4ActCheckinSiap = {};     // tanggal -> true (data check-in tanggal itu sudah dimuat) | 'gagal'
let v4ActScan = null;          // state pemindai kamera yang sedang terbuka
let v4ActServerOffset = 0, v4ActOffsetBound = false;

// ---------- Check-in petugas TERTUNDA (offline / sinyal lemah) ----------
const V4_ACT_CI_TUNDA_KEY = 'simamba_act_checkin_tertunda_v1';
const V4_ACT_CI_TIMEOUT_MS = 15000;
let v4ActCiTunda = v4ActCiTundaBaca();   // '<tanggal>_<typeKey>' -> data check-in yang belum sampai ke server
let v4ActCiTundaJalan = false;
function v4ActCiTundaBaca() {
  try { const o = JSON.parse(localStorage.getItem(V4_ACT_CI_TUNDA_KEY) || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; }
}
function v4ActCiTundaSimpan() {
  try {
    if (Object.keys(v4ActCiTunda).length) localStorage.setItem(V4_ACT_CI_TUNDA_KEY, JSON.stringify(v4ActCiTunda)); else localStorage.removeItem(V4_ACT_CI_TUNDA_KEY);
    return true;
  } catch (e) { console.warn('[SI MAMBA] check-in tertunda gagal disimpan:', e); return false; }
}
function v4ActCiTundaJumlah() { return Object.keys(v4ActCiTunda).length; }
// Tampilkan check-in tertunda milik perangkat ini di v4ActCheckins (hanya bila server belum punya catatan untuk kunci itu).
function v4ActTerapkanTertunda(tgl) {
  Object.keys(v4ActCiTunda).forEach(k => {
    const d = v4ActCiTunda[k];
    if (d && d.tanggal === tgl && !v4ActCheckins[k]) v4ActCheckins[k] = Object.assign({}, d, { tertunda: true });
  });
}
function v4ActSimpanTertunda(type, jarak, el) {
  const tgl = v4Date(), key = tgl + '_' + type.key;
  const telat = Math.max(0, v4ActMenitSekarang() - v4ActMenit(v4ActJamMulai(type)));
  const data = { typeId: type.key, tanggal: tgl, guruKey: v4ActMyId(), guruName: currentUser.name, peran: el.peran, klaim: false, via: 'qr',
    jarak: jarak == null ? null : Math.round(jarak), telatMenit: telat, at: new Date(v4ActNowMs()).toISOString(), offline: true };
  const sebelum = Object.assign({}, v4ActCiTunda);
  v4ActCiTunda[key] = data;
  if (!v4ActCiTundaSimpan()) { v4ActCiTunda = sebelum; throw new Error('Gagal menyimpan check-in di perangkat (penyimpanan penuh atau diblokir).'); }
  v4ActCheckins[key] = Object.assign({}, data, { tertunda: true });
  return Object.assign({ tertunda: true }, data);
}
// Dipakai pemindai: online -> tulis langsung; offline / server tak merespons -> simpan tertunda (kecuali klaim).
function v4ActCheckinKirimAtauTunda(type, jarak) {
  const el = v4ActCekCheckin(type);
  if (!el.ok) return Promise.reject(new Error(el.msg));
  if (!navigator.onLine) {
    if (el.klaim) return Promise.reject(new Error('Klaim petugas pengganti butuh koneksi internet.'));
    try { return Promise.resolve(v4ActSimpanTertunda(type, jarak, el)); } catch (e) { return Promise.reject(e); }
  }
  const key = v4Date() + '_' + type.key;
  return new Promise((resolve, reject) => {
    let selesai = false;
    const tmo = setTimeout(() => {   // online menurut browser, tapi server tak membalas
      if (selesai) return; selesai = true;
      if (el.klaim) return reject(new Error('Server belum merespons. Coba lagi saat sinyal membaik (klaim pengganti tidak bisa ditunda).'));
      try { resolve(v4ActSimpanTertunda(type, jarak, el)); } catch (e) { reject(e); }
    }, V4_ACT_CI_TIMEOUT_MS);
    v4ActTulisCheckin(type, jarak).then(d => {
      clearTimeout(tmo);
      if (selesai) {   // sempat dialihkan ke antrean, ternyata server menerima: buang salinan tertunda
        delete v4ActCiTunda[key]; v4ActCiTundaSimpan(); v4ActRenderUlang(); return;
      }
      selesai = true; resolve(d);
    }, err => {
      clearTimeout(tmo);
      if (selesai) return;   // sudah di antrean: pengirim otomatis yang menentukan (menang / kalah)
      selesai = true; reject(err);
    });
  });
}
// Kirim semua check-in tertunda. Aman diulang: transaction hanya menulis bila belum ada catatan; catatan atas nama yang sama = sukses.
function v4ActCiTundaKirim(manual) {
  if (v4ActCiTundaJalan) return;
  const keys = Object.keys(v4ActCiTunda); if (!keys.length) { if (manual) toast('Tidak ada check-in yang menunggu.', false, 1500); return; }
  if (typeof currentUser === 'undefined' || !currentUser || typeof db === 'undefined' || !db) return;
  if (!navigator.onLine) { if (manual) toast('📡 Masih offline. Check-in dikirim otomatis saat koneksi kembali.', true); return; }
  v4ActCiTundaJalan = true;
  let sisa = keys.length;
  const satuSelesai = () => { if (--sisa <= 0) { v4ActCiTundaJalan = false; v4ActRenderUlang(); } };
  keys.forEach(key => {
    const d = v4ActCiTunda[key]; let beres = false;
    const tmo = setTimeout(() => { if (beres) return; beres = true; if (manual) toast('⏳ Server belum merespons. Dicoba lagi otomatis.', true); satuSelesai(); }, 20000);
    v4ActSiapSesiGuru().then(() => db.ref('activity_checkin_v4/' + key).transaction(cur => { if (cur) return; return Object.assign({}, d, { disinkronAt: new Date().toISOString() }); })).then(res => {
      clearTimeout(tmo);
      const type = v4ActTypeByKey(d.typeId), nama = type ? type.name : d.typeId;
      const cur = res.snapshot.val();
      if (res.committed || (cur && cur.guruKey === d.guruKey)) {
        v4ActCheckins[key] = Object.assign({}, cur || d);
        try { addLog('checkin_petugas_kegiatan_offline', d.typeId + ' - ' + d.guruName); v4Audit('CHECKIN_KEGIATAN', 'ACTIVITY_TYPE', d.typeId, null, { tanggal: d.tanggal, peran: d.peran, jarak: d.jarak, offline: true }); } catch (e) { console.warn('[SI MAMBA] log check-in offline:', e); }
        toast('✅ Check-in offline terkirim: ' + nama, false, 3500);
      } else {
        v4ActCheckins[key] = cur;   // tampilkan petugas yang sah
        try { addLog('checkin_offline_kalah', d.typeId + ' - ' + d.guruName + ' kalah dari ' + (cur && cur.guruName)); } catch (e) { /* log opsional */ }
        toast('❌ Check-in offline Anda untuk ' + nama + ' tidak berlaku: sudah ada petugas ' + ((cur && cur.guruName) || 'lain') + '. Absensi siswa yang Anda isi tetap tersimpan -- minta Admin memeriksanya.', true, 12000);
      }
      delete v4ActCiTunda[key]; v4ActCiTundaSimpan();
      if (!beres) { beres = true; satuSelesai(); }
    }).catch(err => {
      clearTimeout(tmo);
      console.error('[SI MAMBA] Gagal kirim check-in tertunda:', err);
      if (manual) toast('❌ Check-in belum terkirim: ' + ((err && err.message) || err), true);
      if (!beres) { beres = true; satuSelesai(); }
    });
  });
}

function v4ActMyId() { return currentUser ? (currentUser.key || currentUser.name || '') : ''; }
// Jam server (bukan jam HP) supaya mengubah jam perangkat tidak bisa membuka klaim lebih awal.
function v4ActBindOffset() {
  if (v4ActOffsetBound) return;
  try {
    if (typeof db === 'undefined' || !db) return;
    v4ActOffsetBound = true;
    db.ref('.info/serverTimeOffset').on('value', s => { v4ActServerOffset = Number(s.val()) || 0; });
  } catch (e) { console.warn('[SI MAMBA] offset server:', e); }
}
// ============================================================
//  HONOR SHOLAT DARI CHECK-IN PETUGAS (menggantikan Absen Religi "Hadir" sebagai dasar honor)
//  Satu hari sholat dihitung 1x honor untuk guru yang CHECK-IN QR hari itu (PJ / pengganti ditunjuk / pengganti klaim) bila:
//    1) hari itu hari sholat yang berlaku (Dhuha Senin-Sabtu, Dzuhur Senin-Kamis), dan
//    2) absensi siswa untuk sholat itu LENGKAP: semua siswa di semua kelas yang ikut (lihat v4ActKelasAktif) punya status H/S/I/A.
//  Check-in dan absensi siswa keduanya bisa dibuat offline, jadi honor tetap tercatat walau wifi mati. Pemeriksaan dilakukan
//  saat honor dihitung (data sudah di server), bukan saat guru menyimpan. Hari yang tidak lolos tidak dihitung dan alasannya
//  ditampilkan di Rekap Petugas QR (Ringkasan per Guru).
//  Transisi: tanggal sebelum V4_HONOR_SHOLAT_CHECKIN_MULAI tetap dihitung dari Absen Religi "Hadir" seperti sebelumnya.
//  Catatan: daftar siswa yang dipakai adalah daftar SAAT INI (bukan riwayat per tanggal).
// ============================================================
// Mesin honor = honorSholat* di app.js (check-in + jam + absensi lengkap + koreksi Admin). Di sini hanya ADAPTER supaya
// Rekap Petugas QR memakai angka yang sama dengan Rekap Honor / Slip / Laporan (satu sumber).
const V4_HONOR_SHOLAT_CHECKIN_MULAI = (typeof HONOR_SHOLAT_MULAI_CHECKIN !== 'undefined') ? HONOR_SHOLAT_MULAI_CHECKIN : '2026-10-15';
let v4HonorSholatCache = {};   // 'YYYY-MM' -> { status: 'siap'|'gagal', hari: [...], at, msg }
let v4HonorSiswaCache = {};    // (tidak dipakai lagi; dipertahankan agar reset sesi tetap valid)
function v4HonorSholatSebelumMulai(tgl) { return !tgl || tgl < V4_HONOR_SHOLAT_CHECKIN_MULAI; }
function v4HonorSholatYm(thn, bln) { return String(thn) + '-' + String(bln).padStart(2, '0'); }
// Bulan itu memuat tanggal yang dihitung dengan cara check-in?
function v4HonorSholatPakai(thn, bln) { return v4HonorSholatYm(thn, bln) + '-31' >= V4_HONOR_SHOLAT_CHECKIN_MULAI; }
function v4HonorSholatPerluSiap(thn, bln) {
  if (!v4HonorSholatPakai(thn, bln)) return false;
  const c = v4HonorSholatCache[v4HonorSholatYm(thn, bln)];
  return !(c && (c.status === 'siap' || c.status === 'gagal'));
}
function v4HonorSholatHari(thn, bln) { const c = v4HonorSholatCache[v4HonorSholatYm(thn, bln)]; return (c && c.hari) || []; }
// Hari yang menghasilkan honor (hanya tanggal >= mulai).
function v4HonorSholatHariOk(thn, bln) { return v4HonorSholatHari(thn, bln).filter(h => h.ok && !v4HonorSholatSebelumMulai(h.tgl)); }
function v4HonorSholatJenisDari(typeId) { const t = v4ActTypeByKey(typeId); return t ? v4ActJenisSholat(t) : null; }
// Pengisi absensi siswa selain petugas hari itu (PJ/pengganti yang check-in). Hanya penanda untuk Admin memeriksa; tidak mengubah honor.
function v4HonorPengisiLain(ci) {
  const tgl = ci._tgl || ci.tanggal, ym = String(tgl || '').slice(0, 7), c = v4HonorSholatCache[ym];
  if (!c || !c.hari) return '';
  const jenis = v4HonorSholatJenisDari(ci.typeId);
  const gk = (typeof honorSholatResolve === 'function') ? honorSholatResolve(ci.guruKey, ci.guruName) : (ci.guruKey || ci.guruName);
  const h = c.hari.find(x => x.tgl === tgl && x.jenis === jenis && x.guruKey === gk);
  if (!h || !h.pengisi || !h.pengisi.length) return '';
  const lain = h.pengisi.filter(n => !v4ActSamaGuru(ci.guruKey, ci.guruName, '', n) && n !== ci.guruName);
  return lain.length ? '⚠ Absensi siswa diisi: ' + lain.join(', ') : '';
}
// Status honor satu check-in untuk Rincian per Hari: terhitung / belum (+alasan), dan penanda check-in di luar jendela jam.
function v4HonorStatusHari(ci) {
  const tgl = ci._tgl || ci.tanggal;
  if (!tgl || v4HonorSholatSebelumMulai(tgl)) return { teks: '-', luarJam: false };
  const jenis = v4HonorSholatJenisDari(ci.typeId); if (!jenis) return { teks: '-', luarJam: false };
  const c = v4HonorSholatCache[String(tgl).slice(0, 7)];
  if (!c) return { teks: '⏳ memuat...', luarJam: false };
  if (c.status === 'gagal') return { teks: '? (gagal dimuat)', luarJam: false };
  const gk = (typeof honorSholatResolve === 'function') ? honorSholatResolve(ci.guruKey, ci.guruName) : (ci.guruKey || ci.guruName);
  const h = c.hari.find(x => x.tgl === tgl && x.jenis === jenis && x.guruKey === gk);
  if (!h) return { teks: '-', luarJam: false };
  return { teks: h.ok ? '✅ Terhitung' : '⛔ Belum: ' + (h.alasan || 'tidak lolos'), luarJam: /di luar jam/.test(h.alasan || '') };
}
function v4HonorSholatTerapkan(ym, hs) {
  const entri = { status: 'gagal', hari: (v4HonorSholatCache[ym] && v4HonorSholatCache[ym].hari) || [], at: Date.now(), msg: '' };
  if (hs && hs.siap && hs.hasil) {
    const e = hs.hasil.entri || {};
    entri.status = 'siap';
    entri.hari = Object.keys(e).map(k => {
      const x = e[k], alasan = x.koreksi ? ((x.koreksi.aksi === 'Hadir' ? 'Dihitung Admin' : 'Dicabut Admin') + (x.koreksi.alasan ? ': ' + x.koreksi.alasan : '')) : (x.alasanSistem || []).join('; ');
      return { tgl: x.tgl, typeKey: '', typeName: '', jenis: x.jenis, guruKey: x.gk, guruName: x.nama, ok: !!x.lolos, kurang: [], alasan, pengisi: x.pengisi || [] };
    }).sort((a, b) => (a.tgl < b.tgl ? -1 : a.tgl > b.tgl ? 1 : COLLATOR_ID.compare(a.guruName, b.guruName)));
  } else {
    entri.msg = (hs && hs.gagal) || 'Honor sholat belum siap.';
    try { toast('⚠️ Honor sholat gagal dihitung (' + entri.msg + ').', true, 6000); } catch (e) { /* toast opsional */ }
  }
  v4HonorSholatCache[ym] = entri;
  return entri;
}
// Selalu resolve (tidak pernah reject): hasil ada di v4HonorSholatCache; status 'gagal' bila data tak bisa dimuat.
function v4HonorSholatSiapkan(thn, bln, paksa) {
  const ym = v4HonorSholatYm(thn, bln);
  if (typeof honorSholatDapat !== 'function') return Promise.resolve(v4HonorSholatTerapkan(ym, { gagal: 'Modul honor belum termuat. Muat ulang halaman.' }));
  if (paksa && typeof honorSholatInvalidate === 'function') honorSholatInvalidate();
  return new Promise(resolve => {
    let tuntas = false;
    const selesai = hs => { if (tuntas) return; tuntas = true; resolve(v4HonorSholatTerapkan(ym, hs)); };
    const hs = honorSholatDapat(thn, bln, () => selesai(honorSholatDapat(thn, bln)));
    if (hs.siap || hs.gagal) selesai(hs);
  });
}

// Jam server (ms) yang DIBACA SEGAR dari Firebase -- untuk validasi honor sholat yang tidak boleh bergantung pada jam HP.
function v4ActWaktuServer() {
  return new Promise((resolve, reject) => {
    if (typeof db === 'undefined' || !db || !navigator.onLine) return reject(new Error('Butuh koneksi internet untuk memverifikasi waktu server.'));
    let selesai = false;
    const tmo = setTimeout(() => { if (selesai) return; selesai = true; reject(new Error('Server belum merespons.')); }, 8000);
    db.ref('.info/serverTimeOffset').once('value').then(s => {
      if (selesai) return; selesai = true; clearTimeout(tmo);
      v4ActServerOffset = Number(s.val()) || 0;
      resolve(Date.now() + v4ActServerOffset);
    }).catch(e => { if (selesai) return; selesai = true; clearTimeout(tmo); reject(e); });
  });
}
// Absensi siswa sholat harus LENGKAP: semua siswa di semua kelas punya status (H/S/I/A) untuk tanggal itu.
// Dibaca langsung dari server (bukan cache layar). Hasil: null = lengkap; string = alasan penolakan.
function v4ActPeriksaAbsensiLengkap(namaSholat, tanggal) {
  const keys = (typeof v4CariJenisKegiatanSholat === 'function' ? v4CariJenisKegiatanSholat(namaSholat) : []).map(t => t.key);
  if (!keys.length) return Promise.resolve(null);   // jenis kegiatan belum ada: sudah ditolak validasi sebelumnya
  if (!navigator.onLine) return Promise.reject(new Error('Butuh koneksi internet untuk memeriksa kelengkapan absensi siswa.'));
  // Kelas yang wajib lengkap = kelas yang ikut minimal satu jenis kegiatan sholat tsb (kelas yang tidak ikut, mis. pulang lebih awal, dilewati).
  const tipeSholat = (typeof v4CariJenisKegiatanSholat === 'function' ? v4CariJenisKegiatanSholat(namaSholat) : []).map(t => v4ActTypeByKey(t.key) || t);
  const kelasWajib = KELAS_LIST.filter(k => tipeSholat.some(t => !v4ActKelasTidakIkut(t, k)));
  if (!kelasWajib.length) return Promise.resolve(null);
  const sudah = new Set();
  const bacaAbsen = Promise.all(keys.map(k => db.ref('activity_attendance_v4').orderByKey().startAt(k + '_' + tanggal + '_').endAt(k + '_' + tanggal + '_').once('value')
    .then(snap => { snap.forEach(c => { const r = c.val() || {}; if (r.studentId && v4NormStatusKegiatan(r.status)) sudah.add(r.studentId); }); })));
  const bacaSiswa = Promise.all(kelasWajib.map(k => db.ref('siswa').orderByChild('kelas').equalTo(k).once('value').then(snap => {
    const arr = []; snap.forEach(c => { const s = c.val() || {}; arr.push({ key: c.key, name: s.name || c.key }); }); return { kelas: k, siswa: arr };
  })));
  const batas = new Promise((_, tolak) => setTimeout(() => tolak(new Error('Server belum merespons.')), 15000));
  return Promise.race([Promise.all([bacaAbsen, bacaSiswa]), batas]).then(([, grup]) => {
    const kurang = grup.map(g => ({ kelas: g.kelas, belum: g.siswa.filter(s => !sudah.has(s.key)), total: g.siswa.length })).filter(x => x.belum.length);
    if (!kurang.length) return null;
    const rinci = kurang.map(x => { const nm = x.belum.slice(0, 3).map(s => s.name).join(', '); return `${x.kelas}: ${x.belum.length}/${x.total} siswa belum (${nm}${x.belum.length > 3 ? ', dst' : ''})`; }).join('; ');
    return `Absensi siswa Sholat ${namaSholat} hari ini belum lengkap. ${rinci}. Lengkapi dulu di Amalan Yaumiyah.`;
  });
}
function v4ActNowMs() { return Date.now() + v4ActServerOffset; }
function v4ActMenitSekarang() { const d = new Date(v4ActNowMs()); return d.getHours() * 60 + d.getMinutes(); }
function v4ActMenit(jam) { const p = String(jam || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
function v4ActFmtMenit(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
// Jam mulai: yang diatur Admin di kartu kegiatan; kalau belum diatur pakai bawaan per jenis (Dhuha 06:45, Dzuhur 11:05).
const V4_ACT_JAM_SHOLAT = { sholat_dluha: '06:45', sholat_dzuhur: '11:05' };
function v4ActJamMulai(type) {
  if (type && /^\d{2}:\d{2}$/.test(type.jamMulai || '')) return type.jamMulai;
  return V4_ACT_JAM_SHOLAT[v4ActJenisSholat(type)] || V4_ACT_JAM_DEFAULT;
}
function v4ActCheckin(typeKey, tgl) { return v4ActCheckins[(tgl || v4Date()) + '_' + typeKey]; }
function v4ActIsMine(ci) { return !!(ci && ci.guruKey && ci.guruKey === v4ActMyId()); }
function v4ActBuatToken() {
  try { const a = new Uint8Array(9); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join('').toUpperCase(); }
  catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).toUpperCase(); }
}
function v4ActTokenQr(type) { return 'SIMAMBA-KEG|' + type.key + '|' + type.qrToken; }

// ---- Muat check-in (hari ini: live, tanggal lain: sekali ambil). Hanya segelintir catatan per hari. ----
function v4ActLoadCheckins(tgl) {
  if (typeof db === 'undefined' || !db || !currentUser) return;
  v4ActBindOffset();
  v4ActTerapkanTertunda(tgl);   // setelah reload saat offline listener Firebase tak menyala: pulihkan check-in tertunda
  const hariIni = v4Date();
  const ref = db.ref('activity_checkin_v4').orderByKey().startAt(tgl + '_').endAt(tgl + '_\uf8ff');
  const epoch = v4ActEpoch;
  const apply = snap => {
    // Sesi sudah di-reset (logout) selagi data dalam perjalanan / listener gagal di-off: jangan isi ulang state akun baru.
    if (epoch !== v4ActEpoch) { try { ref.off(); } catch (e) {} return; }
    const v = snap.val() || {};
    Object.keys(v4ActCheckins).forEach(k => { if (k.indexOf(tgl + '_') === 0) delete v4ActCheckins[k]; });
    Object.keys(v).forEach(k => { v4ActCheckins[k] = v[k]; });
    v4ActTerapkanTertunda(tgl);   // check-in tertunda yang belum ada di server tetap tampil
    v4ActCheckinSiap[tgl] = true;
    v4ActRenderUlang();
  };
  const gagal = err => {
    if (epoch !== v4ActEpoch) return; // error dari sesi lama (setelah logout) tidak relevan
    console.warn('[SI MAMBA] Gagal memuat check-in kegiatan:', err && err.message || err);
    // Firebase melepas listener sendiri saat ditolak; hapus catatannya supaya pemuatan berikutnya bisa memasang ulang.
    if (v4ActCheckinWatch[tgl] === ref) delete v4ActCheckinWatch[tgl];
    if (!v4ActCheckinSiap[tgl]) { v4ActCheckinSiap[tgl] = 'gagal'; v4ActRenderUlang(); }
  };
  if (tgl === hariIni) {
    if (v4ActCheckinWatch[tgl]) return;
    Object.keys(v4ActCheckinWatch).forEach(t => { try { v4ActCheckinWatch[t].off(); } catch (e) {} delete v4ActCheckinWatch[t]; }); // hari kemarin
    v4ActCheckinWatch[tgl] = ref;
    ref.on('value', apply, gagal);
  } else {
    ref.once('value').then(apply).catch(gagal);
  }
}
function v4ActRenderUlang() { if (document.getElementById('v4ActivityConfig')) { v4RenderActivityCards(); v4RenderActivityFill(); } }
function v4ActBersihkanCheckin() {
  v4ActEpoch++; // batalkan semua callback yang masih berjalan, termasuk once() yang belum selesai
  Object.keys(v4ActCheckinWatch).forEach(t => {
    try { v4ActCheckinWatch[t].off(); } catch (e) { console.warn('[SI MAMBA] Gagal melepas listener check-in ' + t + ':', e); }
  });
  v4ActCheckinWatch = {}; v4ActCheckins = {}; v4ActCheckinSiap = {};
  v4ActTutupScan();
}

// ---- Siapa yang boleh check-in / mengisi ----
function v4ActCekCheckin(type) {
  if (!currentUser) return { ok: false, msg: 'Belum login.' };
  if (v4IsAdmin() || v4IsHead()) return { ok: false, msg: 'Admin/Kepala Madrasah tidak perlu check-in.' };
  const tgl = v4Date();
  const ci = v4ActCheckin(type.key, tgl);
  if (ci) return { ok: false, tampil: false, msg: v4ActIsMine(ci) ? 'Anda sudah check-in hari ini.' : 'Sudah ada petugas hari ini: ' + ci.guruName + '.' };
  const jenis = v4ActJenisSholat(type);
  if (jenis && typeof v4HariDiizinkanSholat === 'function' && !v4HariDiizinkanSholat(jenis, tgl)) return { ok: false, tampil: false, msg: 'Hari ini bukan jadwal ' + type.name + '.' };
  const isPj = v4ActAkuCocok(type.picKey, type.picName);
  if (isPj) return { ok: true, peran: 'PJ' };
  const sub = V4.activitySubstitutes && V4.activitySubstitutes[type.key + '_' + tgl];
  if (sub) {
    const subMe = v4ActAkuCocok(sub.guruKey, sub.guruName);
    if (subMe) return { ok: true, peran: 'Pengganti' };
    return { ok: false, tampil: false, msg: 'Admin sudah menunjuk ' + sub.guruName + ' sebagai pengganti hari ini.' };
  }
  const buka = v4ActMenit(v4ActJamMulai(type)) + V4_ACT_GRACE_MENIT;
  if (v4ActMenitSekarang() < buka) return { ok: false, tampil: true, msg: 'Klaim petugas pengganti dibuka pukul ' + v4ActFmtMenit(buka) + ' bila PJ belum check-in.' };
  return { ok: true, peran: 'Pengganti', klaim: true };
}
// Hari ini: wajib sudah check-in (kecuali Admin/Kepsek). Tanggal lampau: PJ/pengganti yang tercatat untuk tanggal itu.
function v4ActBolehIsi(type, tgl) {
  if (v4IsAdmin() || v4IsHead()) return true;
  if (tgl === v4Date()) return v4ActIsMine(v4ActCheckin(type.key, tgl));
  return v4IsActivityPic(type, tgl);
}

// ---- Tampilan: blok di kartu kegiatan & di panel isi absensi ----
function v4ActCardExtra(a) {
  const tgl = v4Date(), ci = v4ActCheckin(a.key, tgl), k = escapeJs(a.key);
  const adm = v4IsAdmin() || v4IsHead();
  const jam = v4ActJamMulai(a);
  const kec = v4ActKelasKecuali(a);
  let h = kec.length ? `<div style="margin-top:7px;"><span class="v4-chip" title="Kelas ini tidak dihitung kurang/alpa pada kegiatan ini">🚸 Kelas tidak ikut: ${v4Safe(kec.join(', '))}</span></div>` : '';
  h += adm ? '' : `<div class="v4-muted" style="margin-top:7px;font-size:11px;">⏰ Mulai ${v4Safe(jam)} · klaim ${v4ActFmtMenit(v4ActMenit(jam) + V4_ACT_GRACE_MENIT)}</div>`;
  if (ci) {
    const jamCi = ci.at ? new Date(ci.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    h += `<div style="margin-top:7px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:6px 8px;font-size:11px;color:#065f46;">✅ Petugas hari ini: <strong>${v4Safe(ci.guruName)}</strong> (${v4Safe(ci.peran || 'PJ')})${jamCi ? ' · check-in ' + v4Safe(jamCi) : ''}${ci.tertunda ? ' · ⏳ menunggu dikirim ke server' : (ci.offline ? ' · 📡 offline' : '')}${adm ? ` <button class="btn btn-soft" style="padding:2px 7px;font-size:10px;min-height:22px;margin-left:4px;" onclick="v4ActResetCheckin('${k}')">Reset</button>` : ''}</div>`;
  } else if (!adm) {
    const el = v4ActCekCheckin(a);
    if (el.ok) {
      const label = el.peran === 'PJ' ? '📷 Check-in PJ (Scan QR)' : (el.klaim ? '🙋 PJ Tidak Hadir? Klaim Petugas (Scan QR)' : '📷 Check-in Pengganti (Scan QR)');
      h += `<div style="margin-top:7px;"><button class="btn btn-success" style="padding:5px 10px;font-size:11px;min-height:30px;" onclick="v4ActMulaiScan('${k}')">${label}</button></div>`;
    } else if (el.tampil) {
      h += `<div class="v4-muted" style="margin-top:7px;font-size:11px;">🕒 ${v4Safe(el.msg)}</div>`;
    }
  }
  if (v4CanAdmin()) {
    h += `<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
      <label class="v4-muted" style="font-size:10px;margin:0;">Jam mulai</label>
      <input type="time" class="field" style="width:100px;font-size:11px;padding:3px 5px;" value="${v4Safe(jam)}" onchange="v4ActSetJam('${k}', this.value)">
      <button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4ActCetakQr('${k}', false)">🖨️ ${a.qrToken ? 'Cetak QR' : 'Buat & Cetak QR'}</button>
      ${a.qrToken ? `<button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4ActCetakQr('${k}', true)">🔑 Ganti Kode</button>` : ''}
      <button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4ActToggleKelasForm('${k}')">👥 Kelas Peserta</button>
    </div>`;
    if (v4ActKelasFormOpen === a.key) {
      const boxes = KELAS_LIST.map(kl => `<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;margin:0 10px 4px 0;"><input type="checkbox" data-v4kls="${v4Safe(a.key)}" value="${v4Safe(kl)}" ${kec.includes(kl) ? '' : 'checked'}> ${v4Safe(kl)}</label>`).join('');
      h += `<div style="margin-top:7px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="font-size:11px;margin-bottom:5px;color:#374151;">Centang kelas yang <strong>ikut</strong> ${v4Safe(a.name)}. Kelas yang tidak dicentang (mis. pulang lebih awal) tidak ikut tampil di "Semua Kelas", tidak dihitung kurang pada syarat honor, dan tidak dinilai "belum diisi".</div>
        <div>${boxes}</div>
        <button class="btn btn-success" style="padding:4px 10px;font-size:11px;margin-top:4px;" onclick="v4ActSimpanKelasPeserta('${k}')">💾 Simpan</button>
      </div>`;
    }
  }
  return h;
}
function v4ActRenderCheckinBlock(type, tgl) {
  const k = escapeJs(type.key);
  if (tgl !== v4Date()) {
    // Tanggal lampau: "tidak tercatat" baru benar kalau data check-in tanggal itu SUDAH dimuat. Sebelum itu (atau kalau gagal)
    // kondisi tidak bisa dinilai, jadi jangan menuduh pengguna bukan petugas.
    const siap = v4ActCheckinSiap[tgl];
    if (siap !== true) {
      const gagal = siap === 'gagal';
      return `<div class="v4-muted" style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;">${gagal ? '⚠️ Data petugas tanggal ' + v4Safe(tgl) + ' gagal dimuat.' : '⏳ Memuat data petugas tanggal ' + v4Safe(tgl) + '...'} <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" onclick="v4ActLoadCheckins('${escapeJs(tgl)}')">${gagal ? 'Coba lagi' : 'Muat ulang'}</button></div>`;
    }
    return `<div class="v4-muted" style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;">Anda tidak tercatat sebagai petugas pada tanggal ${v4Safe(tgl)}. Hubungi Admin/Kepala Madrasah.</div>`;
  }
  const ci = v4ActCheckin(type.key, tgl);
  if (ci && !v4ActIsMine(ci)) {
    return `<div style="margin-top:10px;padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;">🔒 Petugas hari ini sudah tercatat: <strong>${v4Safe(ci.guruName)}</strong> (${v4Safe(ci.peran || 'PJ')}). Absensi hari ini diisi oleh beliau.</div>`;
  }
  if (ci && ci.tertunda && v4ActIsMine(ci)) {
    return `<div style="margin-top:10px;padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:12px;color:#065f46;">✅ Anda petugas ${v4Safe(type.name)} hari ini. ⏳ Check-in dari mode offline tersimpan di perangkat dan dikirim otomatis saat online.</div>`;
  }
  const el = v4ActCekCheckin(type);
  if (el.ok) {
    return `<div style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;font-size:12px;">Check-in sebagai petugas dulu.<div style="margin-top:6px;"><button class="btn btn-success" onclick="v4ActMulaiScan('${k}')">📷 Scan QR Check-in</button></div></div>`;
  }
  return `<div style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;font-size:12px;">${v4Safe(el.msg)}</div>`;
}

// ---- Pemindai kamera ----
function v4ActStatusScan(teks, galat) {
  const el = document.getElementById('v4ActScanStatus'); if (!el) return;
  el.textContent = teks; el.style.color = galat ? '#fca5a5' : '#fff';
}
function v4ActTutupScan() {
  const s = v4ActScan; v4ActScan = null;
  if (s) {
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.stream) s.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
  }
  const ov = document.getElementById('v4ActScanOverlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}
function v4ActMulaiScan(typeKey) {
  const type = v4ActTypeByKey(typeKey); if (!type) return toast('Kegiatan tidak ditemukan!', true);
  if (v4ActScan) return;
  const el = v4ActCekCheckin(type); if (!el.ok) return toast(el.msg, true);
  if (!navigator.onLine && el.klaim) return toast('Klaim petugas pengganti butuh koneksi internet. PJ atau pengganti yang ditunjuk Admin bisa check-in saat offline.', true);
  if (!type.qrToken) return toast('QR kegiatan ini belum dibuat. Minta Admin menekan "Buat & Cetak QR" di kartu kegiatan.', true);
  if (typeof jsQR !== 'function') return toast('⚠️ Modul scan QR gagal dimuat. Cek koneksi internet lalu refresh halaman.', true);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Kamera tidak didukung di perangkat/browser ini (butuh HTTPS).', true);
  const ov = document.createElement('div');
  ov.id = 'v4ActScanOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px;';
  ov.innerHTML = `<div style="color:#fff;font-weight:700;font-size:15px;text-align:center;">📷 Scan QR ${escapeHtml(type.name)}</div>
    <video id="v4ActScanVideo" playsinline muted style="width:100%;max-width:360px;border-radius:12px;background:#000;"></video>
    <div id="v4ActScanStatus" style="color:#fff;font-size:13px;text-align:center;max-width:360px;">${navigator.onLine ? 'Arahkan kamera ke QR di lokasi kegiatan...' : '📡 Offline: check-in disimpan di perangkat lalu dikirim otomatis saat online. Arahkan kamera ke QR...'}</div>
    <button class="btn btn-soft" onclick="v4ActTutupScan()">✖️ Batal</button>`;
  document.body.appendChild(ov);
  const canvas = document.createElement('canvas');
  v4ActScan = { typeKey, stream: null, raf: 0, proses: false, lastErr: 0, canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
  const mine = v4ActScan;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(stream => {
    if (v4ActScan !== mine) { stream.getTracks().forEach(t => t.stop()); return; } // dibatalkan sebelum kamera siap
    mine.stream = stream;
    const v = document.getElementById('v4ActScanVideo'); v.srcObject = stream;
    return v.play().then(() => { mine.raf = requestAnimationFrame(v4ActTickScan); });
  }).catch(err => {
    console.warn('[SI MAMBA] kamera:', err);
    v4ActStatusScan('❌ Kamera tidak bisa dibuka (' + (err && err.name || 'error') + '). Izinkan akses kamera lalu coba lagi.', true);
  });
}
function v4ActTickScan() {
  const s = v4ActScan; if (!s || s.proses) return;
  const v = document.getElementById('v4ActScanVideo');
  if (v && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
    const w = v.videoWidth, h = v.videoHeight;
    s.canvas.width = w; s.canvas.height = h;
    s.ctx.drawImage(v, 0, 0, w, h);
    let code = null;
    try { code = jsQR(s.ctx.getImageData(0, 0, w, h).data, w, h); } catch (e) { /* frame rusak, lewati */ }
    if (code && code.data) { v4ActProsesQr(code.data); if (v4ActScan !== s || s.proses) return; }
  }
  s.raf = requestAnimationFrame(v4ActTickScan);
}
function v4ActProsesQr(data) {
  const s = v4ActScan; if (!s) return;
  const type = v4ActTypeByKey(s.typeKey);
  const p = String(data).split('|');
  const cocok = !!type && type.qrToken && p.length === 3 && p[0] === 'SIMAMBA-KEG' && p[1] === s.typeKey && p[2] === type.qrToken;
  if (!cocok) {
    if (Date.now() - s.lastErr > 1500) {
      s.lastErr = Date.now();
      v4ActStatusScan(p[0] === 'SIMAMBA-KEG' && p[1] !== s.typeKey ? '❌ Itu QR kegiatan lain. Scan QR ' + (type ? type.name : 'yang sesuai') + '.' : '❌ QR tidak dikenali atau sudah tidak berlaku. Coba lagi...', true);
    }
    return;
  }
  s.proses = true;
  if (s.raf) cancelAnimationFrame(s.raf);
  if (s.stream) s.stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
  const v = document.getElementById('v4ActScanVideo'); if (v) v.style.display = 'none';
  v4ActStatusScan('📍 QR terbaca. Memeriksa lokasi GPS...');
  let menulis = false; // true = sudah masuk tahap tulis ke server (tidak bisa dibatalkan lagi)
  v4ActCekLokasi().then(jarak => {
    // Pengguna menekan Batal selama menunggu GPS: jangan lanjut menulis check-in.
    if (v4ActScan !== s) { const e = new Error('batal'); e.batal = true; throw e; }
    menulis = true;
    v4ActStatusScan('💾 Menyimpan check-in... (menutup jendela ini tidak membatalkan penyimpanan)');
    return v4ActCheckinKirimAtauTunda(type, jarak);
  // Dua argumen (bukan .then().catch()): error di UI sukses TIDAK ikut memicu toast gagal setelah toast sukses.
  }).then(hasil => {
    if (v4ActScan === s) v4ActTutupScan(); // jangan menutup pemindai baru milik sesi lain
    if (hasil && hasil.tertunda) toast('✅ Check-in tersimpan (offline): Anda petugas ' + type.name + ' hari ini. Dikirim otomatis saat online.', false, 5000);
    else toast('✅ Check-in berhasil: Anda petugas ' + type.name + ' hari ini');
    v4ActRenderUlang();
  }, err => {
    if (err && err.batal) return;
    if (v4ActScan !== s && !menulis) return; // dibatalkan, lalu GPS gagal: tidak perlu mengganggu
    if (v4ActScan === s) v4ActTutupScan();
    let pesan = (err && err.message) || String(err);
    // Bedakan "ditolak server" (Rules Firebase) dari izin kamera/lokasi: dulu semuanya terbaca sebagai "denied" yang membingungkan.
    if (/permission[_ ]denied/i.test(((err && err.code) || '') + ' ' + pesan)) pesan = 'Ditolak oleh server (Rules Firebase). Minta Admin memastikan Rules terbaru (node activity_checkin_v4; check-in terikat akun guru, pastikan Migrasi kredensial sudah dijalankan) sudah dipublikasikan, lalu coba lagi.';
    toast('❌ ' + pesan, true, 8000);
    v4ActRenderUlang();
  }).catch(e => console.error('[SI MAMBA] Gagal memperbarui tampilan check-in:', e));
}
// Pakai titik & radius madrasah yang sama dengan absensi guru (V4.absenQr). Belum diatur -> lewati cek jarak.
function v4ActCekLokasi() {
  return new Promise((resolve, reject) => {
    const cfg = (typeof V4 !== 'undefined' && V4) ? V4.absenQr : null;
    const lat = cfg ? parseFloat(cfg.lat) : NaN, lng = cfg ? parseFloat(cfg.lng) : NaN;
    if (isNaN(lat) || isNaN(lng)) return resolve(null); // titik madrasah belum diatur -> cek jarak dilewati
    // Titik SUDAH diatur: kalau tidak bisa diperiksa, tolak (jangan diam-diam meloloskan).
    if (typeof v4HitungJarakMeter !== 'function') return reject(new Error('Pemeriksa jarak belum termuat. Refresh halaman lalu coba lagi.'));
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung GPS, check-in tidak bisa dilanjutkan.'));
    navigator.geolocation.getCurrentPosition(pos => {
      // Callback GPS berjalan di luar executor Promise: error di sini tidak otomatis jadi reject -> tanpa try/catch pemindai menggantung.
      try {
        const jarak = v4HitungJarakMeter(pos.coords.latitude, pos.coords.longitude, lat, lng);
        if (typeof jarak !== 'number' || !isFinite(jarak)) return reject(new Error('Posisi GPS tidak valid. Coba lagi di tempat terbuka.'));
        const r = parseFloat(cfg.radius);
        const radius = (isFinite(r) && r > 0) ? r : 150; // kosong/NaN/0/negatif -> bawaan 150 m (radius negatif akan menolak semua orang)
        if (jarak > radius) return reject(new Error('Anda terlalu jauh dari madrasah (±' + Math.round(jarak) + ' m, maksimal ' + radius + ' m). Check-in harus di lokasi.'));
        resolve(jarak);
      } catch (e) { reject(e); }
    }, err => reject(new Error((err && err.code === 1) ? 'Izin LOKASI ditolak di browser. Izinkan lokasi untuk situs ini (ikon gembok di address bar > Izin > Lokasi), aktifkan GPS, lalu scan ulang.' : 'GPS gagal: ' + (err && err.message || 'tidak bisa membaca lokasi') + '. Aktifkan lokasi lalu coba lagi.')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
// Satu catatan per kegiatan per hari; transaction: yang pertama menang, yang kedua mendapat pesan jelas.
// Rules mengikat check-in ke identitas guru: sebelum menulis, sesi_guru/{uid} diisi bukti login (kredensial.js). Gagal -> ditolak jelas.
function v4ActSiapSesiGuru() {
  return (typeof window.kredGuruSiap === 'function') ? Promise.resolve(window.kredGuruSiap()) : Promise.resolve(true);
}
function v4ActTulisCheckin(type, jarak) {
  const el = v4ActCekCheckin(type);   // cek ulang: keadaan bisa berubah selama scan/GPS
  if (!el.ok) return Promise.reject(new Error(el.msg));
  const tgl = v4Date();
  const telat = Math.max(0, v4ActMenitSekarang() - v4ActMenit(v4ActJamMulai(type)));
  const data = { typeId: type.key, tanggal: tgl, guruKey: v4ActMyId(), guruName: currentUser.name, peran: el.peran + (el.klaim ? ' (klaim)' : ''), klaim: !!el.klaim, via: 'qr', jarak: jarak == null ? null : Math.round(jarak), telatMenit: telat, at: new Date(v4ActNowMs()).toISOString() };
  return v4ActSiapSesiGuru().then(() => db.ref('activity_checkin_v4/' + tgl + '_' + type.key).transaction(cur => { if (cur) return; return data; })).then(res => {
    if (!res.committed) { const cur = res.snapshot.val(); throw new Error('Sudah ada petugas hari ini: ' + ((cur && cur.guruName) || 'guru lain') + '.'); }
    v4ActCheckins[tgl + '_' + type.key] = data;
    // Check-in sudah tercatat di server. Kegagalan log/audit tidak boleh membuatnya dilaporkan sebagai gagal.
    try {
      addLog(el.klaim ? 'klaim_petugas_kegiatan' : 'checkin_petugas_kegiatan', type.key + ' - ' + currentUser.name);
      v4Audit('CHECKIN_KEGIATAN', 'ACTIVITY_TYPE', type.key, null, { tanggal: tgl, peran: data.peran, jarak: data.jarak });
    } catch (e) { console.warn('[SI MAMBA] Gagal mencatat log check-in:', e); }
    return data;
  });
}
function v4ActResetCheckin(typeKey) {
  if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah!', true);
  const tgl = v4Date(), ci = v4ActCheckin(typeKey, tgl); if (!ci) return;
  // Cek koneksi SEBELUM konfirmasi: jangan minta Admin menyetujui sesuatu yang pasti gagal.
  if (!v4ActButuhOnline('Reset petugas butuh koneksi internet.')) return;
  if (!confirm('Reset petugas hari ini (' + ci.guruName + ')? Guru bisa check-in/klaim ulang. Absensi siswa yang sudah tersimpan tidak terhapus.')) return;
  db.ref('activity_checkin_v4/' + tgl + '_' + typeKey).remove().then(() => {
    delete v4ActCheckins[tgl + '_' + typeKey];
    v4ActLogAman('reset_petugas_kegiatan', typeKey + ' - ' + ci.guruName);
    toast('Petugas hari ini di-reset');
    v4ActRenderUlang();
  }).catch(v4ActGagal);
}

// ---- Admin: jam mulai & QR kegiatan ----
function v4ActSetJam(typeKey, jam) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  if (!/^\d{2}:\d{2}$/.test(jam || '')) { toast('Jam tidak valid.', true); return v4RenderActivityCards(); }
  const a = v4ActTypeByKey(typeKey); if (!a) return;
  if (!v4ActButuhOnline('Mengubah jam mulai butuh koneksi internet.')) return v4RenderActivityCards();
  const upd = { jamMulai: jam, updatedAt: new Date().toISOString() };
  db.ref('activity_types_v4/' + typeKey).update(upd).then(() => {
    Object.assign(a, upd); v4ActPersistCache();
    toast('✅ Jam mulai ' + a.name + ': ' + jam);
    v4RenderActivityCards();
  }).catch(err => { v4ActGagal(err); v4RenderActivityCards(); });
}
function v4ActCetakQr(typeKey, ganti) {
  if (!v4CanAdmin()) return toast('Hanya Admin!', true);
  const type = v4ActTypeByKey(typeKey); if (!type) return;
  if (typeof QRCode === 'undefined') return toast('⚠️ Modul pembuat QR belum termuat. Refresh halaman lalu coba lagi.', true);
  if (ganti && !confirm('Ganti kode QR "' + type.name + '"? QR lama yang sudah dicetak/dipasang tidak berlaku lagi.')) return;
  const butuhTulis = ganti || !type.qrToken;
  if (butuhTulis && !v4ActButuhOnline('Membuat kode QR butuh koneksi internet.')) return;
  const w = window.open('', '_blank', 'width=700,height=900'); // dibuka SEKARANG (dalam klik) agar tidak diblokir popup
  if (!w) return toast('Popup diblokir browser. Izinkan popup untuk situs ini.', true);
  const tulis = butuhTulis
    ? (() => { const upd = { qrToken: v4ActBuatToken(), qrUpdatedAt: new Date().toISOString() }; return db.ref('activity_types_v4/' + typeKey).update(upd).then(() => { Object.assign(type, upd); v4ActPersistCache(); v4RenderActivityCards(); }); })()
    : Promise.resolve();
  tulis.then(() => {
    const tmp = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(tmp);
    try { new QRCode(tmp, { text: v4ActTokenQr(type), width: 300, height: 300, correctLevel: QRCode.CorrectLevel.H }); }
    catch (e) { document.body.removeChild(tmp); throw e; }
    // Ambil gambar QR: kanvas biasanya sudah tergambar sinkron, <img> bisa menyusul. Coba berulang (±2 dtk)
    // alih-alih menunggu waktu tetap yang bisa terlalu singkat di perangkat lambat.
    const ambilUrl = () => {
      const c = tmp.querySelector('canvas'), im = tmp.querySelector('img');
      try { if (c && c.width) { const u = c.toDataURL('image/png'); if (u && u.length > 100) return u; } } catch (e) { /* coba <img> */ }
      return (im && im.src && im.src.indexOf('data:image') === 0) ? im.src : '';
    };
    const selesai = url => {
      if (tmp.parentNode) tmp.parentNode.removeChild(tmp);
      if (!url) { try { w.close(); } catch (e) {} return toast('❌ Gagal membuat gambar QR.', true); }
      if (w.closed) return toast('Jendela cetak QR sudah ditutup. Tekan Cetak QR lagi.', true);
      const nama = escapeHtml(type.name);
      try {
        w.document.write(`<html><head><title>QR ${nama} - SI MAMBA</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#111}img{width:320px;height:320px;border:1px solid #ddd;padding:12px;border-radius:12px}h1{font-size:26px;margin-bottom:4px}p{color:#555;font-size:14px}.k{font-size:12px;color:#999;margin-top:24px}</style></head><body><h1>QR Check-in Petugas</h1><h2>${nama}</h2><img src="${url}"><p>Petugas scan QR ini di lokasi kegiatan lewat aplikasi SI MAMBA<br>(menu Amalan Yaumiyah) sebelum mengisi absensi siswa.</p><p class="k">Jangan difoto atau dibagikan. Bila bocor, Admin dapat menekan "Ganti Kode".</p><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
        w.document.close();
      } catch (e) {
        try { w.close(); } catch (e2) {}
        toast('❌ Gagal membuka jendela cetak QR: ' + (e && e.message || e), true);
      }
    };
    let coba = 0;
    const tunggu = () => {
      const url = ambilUrl();
      if (url || ++coba >= 20) return selesai(url);
      setTimeout(tunggu, 100);
    };
    tunggu();
  }).catch(err => { try { w.close(); } catch (e) {} v4ActGagal(err); });
}

// ============================================================
// PENGINGAT BERTINGKAT untuk PJ / pengganti (Sholat Dhuha & Dzuhur)
// Berjalan di perangkat guru yang sedang membuka aplikasi (tanpa server), sekali per tahap per hari:
//   Tahap 1: jam mulai + V4_ACT_GRACE_MENIT (klaim pengganti terbuka)  -> "absensi belum lengkap"
//   Tahap 2: jam mulai + V4_ACT_INGAT_BATAS_MENIT (kelas yang kurang jadi MERAH di dashboard Admin/Kepsek)
// Yang diingatkan: petugas yang check-in hari itu; kalau belum ada yang check-in -> PJ atau pengganti yang ditunjuk Admin.
// Kelas yang tidak ikut kegiatan (kelasTidakIkut, mis. kelas 1 & 2 untuk Dzuhur) tidak dihitung (v4ActKelasAktif).
// Kelengkapan dibaca dari server (bukan cache layar); berhenti membaca untuk hari itu begitu sudah lengkap.
// ============================================================
const V4_ACT_INGAT_BATAS_MENIT = 60;     // samakan dengan MONITOR_SHOLAT_TOLERANSI_MENIT di js/monitor-petugas.js
const V4_ACT_INGAT_AKHIR_MENIT = 240;    // lewat jam mulai + ini, tidak diingatkan lagi hari itu
let v4ActIngatSibuk = false, v4ActKalenderDicoba = false;

function v4ActIngatKunci(tgl, typeKey, tahap) { return 'v4ActIngat_' + tgl + '_' + typeKey + '_' + tahap; }
function v4ActIngatAda(k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }
function v4ActIngatSet(k) { try { localStorage.setItem(k, '1'); } catch (e) {} }
function v4ActIngatBersihkan(tgl) {
  try { Object.keys(localStorage).forEach(k => { if (k.indexOf('v4ActIngat_') === 0 && k.indexOf('v4ActIngat_' + tgl + '_') !== 0) localStorage.removeItem(k); }); } catch (e) {}
}

// -> Promise<[{kelas, total, terisi}]> kelas aktif yang belum lengkap (total > 0 dan terisi < total).
function v4ActIngatKurang(type, tgl) {
  const awal = type.key + '_' + tgl + '_';
  const sudah = new Set();
  const bacaAbsen = db.ref('activity_attendance_v4').orderByKey().startAt(awal).endAt(awal + '\uf8ff').once('value')
    .then(snap => { snap.forEach(c => { const r = c.val() || {}; if (r.studentId && v4NormStatusKegiatan(r.status)) sudah.add(r.studentId); }); });
  const bacaSiswa = Promise.all(v4ActKelasAktif(type).map(k => {
    const cache = (typeof v4PanelSiswaCache !== 'undefined') ? v4PanelSiswaCache[k] : null;
    if (cache) return Promise.resolve({ kelas: k, ids: cache.map(s => s.key) });
    return db.ref('siswa').orderByChild('kelas').equalTo(k).once('value').then(snap => { const ids = []; snap.forEach(c => { ids.push(c.key); }); return { kelas: k, ids }; });
  }));
  return Promise.all([bacaAbsen, bacaSiswa]).then(([, grup]) =>
    grup.map(g => ({ kelas: g.kelas, total: g.ids.length, terisi: g.ids.filter(id => sudah.has(id)).length })).filter(x => x.total && x.terisi < x.total));
}

function v4ActIngatTick() {
  if (v4ActIngatSibuk || !currentUser || typeof db === 'undefined' || !db || !navigator.onLine || document.hidden) return;
  if (v4IsAdmin() || v4IsHead()) return;           // Admin/Kepsek memantau lewat kartu dashboard
  const tgl = v4Date(), now = v4ActMenitSekarang();
  v4ActIngatBersihkan(tgl);
  if (typeof monitorLiburSet === 'function') {
    if (!v4ActKalenderDicoba && (!allKalenderAkademik || !allKalenderAkademik.length) && typeof reloadDataset === 'function') {
      v4ActKalenderDicoba = true; reloadDataset('kalenderAkademik', () => {});   // Kalender Akademik dimuat malas
    }
    if (monitorLiburSet().has(tgl)) return;
  }
  const types = (V4.activityTypes || []).filter(t => v4ActJenisSholat(t));
  for (const t of types) {
    if (!v4HariDiizinkanSholat(v4ActJenisSholat(t), tgl)) continue;
    const mulai = v4ActMenit(v4ActJamMulai(t));
    const tahap = (now >= mulai + V4_ACT_INGAT_BATAS_MENIT && now < mulai + V4_ACT_INGAT_AKHIR_MENIT) ? 2
      : (now >= mulai + V4_ACT_GRACE_MENIT && now < mulai + V4_ACT_INGAT_BATAS_MENIT) ? 1 : 0;
    const kTahap = v4ActIngatKunci(tgl, t.key, tahap), kSelesai = v4ActIngatKunci(tgl, t.key, 'selesai');
    if (!tahap || v4ActIngatAda(kTahap) || v4ActIngatAda(kSelesai)) continue;
    if (v4ActCheckinSiap[tgl] === undefined) { v4ActLoadCheckins(tgl); continue; }   // data check-in belum ada; tick berikutnya
    if (v4ActCheckinSiap[tgl] !== true && v4ActCheckinSiap[tgl] !== 'gagal') continue;  // masih memuat
    const ci = v4ActCheckin(t.key, tgl);
    const sub = V4.activitySubstitutes && V4.activitySubstitutes[t.key + '_' + tgl];
    const tanggungJawab = ci ? v4ActIsMine(ci) : (v4ActAkuCocok(t.picKey, t.picName) || !!(sub && v4ActAkuCocok(sub.guruKey, sub.guruName)));
    if (!tanggungJawab) continue;
    v4ActIngatSibuk = true;
    v4ActIngatKurang(t, tgl).then(kurang => {
      if (!kurang.length) { v4ActIngatSet(kSelesai); return; }
      v4ActIngatSet(kTahap);
      const rinci = kurang.map(x => x.terisi === 0 ? `${x.kelas} (belum ada)` : `${x.kelas} (${x.terisi}/${x.total})`).join(', ');
      const judul = tahap === 1 ? `⏰ ${t.name}: absensi belum lengkap` : `⚠️ ${t.name}: batas waktu terlewat`;
      const isi = tahap === 1
        ? `Kelas: ${rinci}. Mohon segera diisi di Amalan Yaumiyah.${ci ? '' : ' PJ belum check-in; guru lain sudah bisa klaim sebagai pengganti (scan QR).'}`
        : `Kelas: ${rinci}. Kelas ini sekarang ditandai MERAH di dashboard Admin/Kepala Madrasah. Mohon segera dilengkapi.`;
      toast(judul + ' ' + isi, true, 12000);
      try { v4Notify(judul, isi, 'INFO', currentUser.key || currentUser.name).catch(() => {}); } catch (e) {}   // tersimpan di lonceng notifikasi
    }).catch(e => console.warn('[SI MAMBA] Pengingat absensi sholat gagal:', e && e.message || e))
      .then(() => { v4ActIngatSibuk = false; });
    return;                                         // satu pengecekan per putaran
  }
}
setTimeout(v4ActIngatTick, 20000);
setInterval(v4ActIngatTick, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(v4ActIngatTick, 2000); });

// ============================================================
// PORTAL ORANG TUA: kartu "Sholat Dhuha & Dzuhur" (rekap semester yang diterbitkan wali kelas)
// renderPortalOrtuDashboard (app.js) membangun halaman SEKALI lewat content.innerHTML setelah semua data terbaca, jadi fungsi itu
// dibungkus: setelah halaman jadi, kartu disisipkan sesudah kartu "Kehadiran Bulan Ini" dan diisi dari node kecil
// rekap_sholat_raport (2 pembacaan: Genap & Ganjil tahun ajaran aktif). Kalau gagal dibaca, kartu dibuang diam-diam.
// ============================================================
function v4PortalSholatPeriode(semester) { return String(currentTahunAjaran || '').replace(/[\/.#$\[\]]/g, '-') + '_' + semester; }
function v4PortalSholatBaca(siswa) {
  return Promise.all(['Genap', 'Ganjil'].map(sm =>
    db.ref('rekap_sholat_raport/' + v4PortalSholatPeriode(sm) + '/' + siswa.key).once('value').then(sn => (sn.val() ? Object.assign({ semester: sm }, sn.val()) : null))
  )).then(l => l.filter(Boolean));
}
function v4PortalSholatBlok(nama, r) {
  const hdr = `<div style="font-weight:600;font-size:13px;margin:8px 0 4px;">${escapeHtml(nama)}</div>`;
  if (!r || r.tidakIkut) return hdr + `<p class="text-muted" style="font-size:12px;">${r && r.tidakIkut ? 'Kelas ini tidak mengikuti ' + escapeHtml(nama) + ' berjamaah di madrasah.' : 'Belum ada data.'}</p>`;
  if (r.ada === false) return hdr + '<p class="text-muted" style="font-size:12px;">Belum ada data.</p>';
  const n = v => Number(v) || 0;
  const kotak = (v, label, warna) => `<div><div style="font-size:18px;font-weight:800;color:${warna};">${n(v)}</div><div class="text-muted" style="font-size:11px;">${label}</div></div>`;
  const pct = (r.pct === null || r.pct === undefined) ? '-' : n(r.pct) + '%';
  const pred = r.pred ? escapeHtml(r.pred) + (n(r.T) > 0 ? '*' : '') : '-';
  return hdr + `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">${kotak(r.H, 'Hadir', '#059669')}${kotak(r.S, 'Sakit', '#d97706')}${kotak(r.I, 'Izin', '#2563eb')}${kotak(r.A, 'Alfa', '#dc2626')}</div>
    <p style="font-size:12px;margin-top:6px;">% Hadir: <strong>${pct}</strong> · Predikat: <strong>${pred}</strong></p>`;
}
function v4PortalSholatHtml(list) {
  const urut = list.slice().sort((a, b) => (a.semester === b.semester ? 0 : a.semester === 'Genap' ? -1 : 1));
  return urut.map(d => {
    const adaT = [d.dhuha, d.dzuhur].some(r => r && Number(r.T) > 0);
    const catatan = [];
    if (d.udzur) catatan.push('Predikat dihitung dari kehadiran dibanding hadir + alfa; sakit dan izin tidak menurunkan predikat.');
    if (adaT) catatan.push('* Ada hari yang belum tercatat; hari itu tidak dihitung ke persen.');
    if (d.lengkap === false) catatan.push('Rekap ini masih sementara karena data kelas belum lengkap.');
    return `<div style="padding:8px 0;border-top:1px solid #f1f5f9;">
      <div style="font-size:12px;font-weight:700;">Semester ${escapeHtml(d.semester)} ${escapeHtml(d.tahunAjaran || '')}</div>
      ${v4PortalSholatBlok('Sholat Dhuha', d.dhuha)}${v4PortalSholatBlok('Sholat Dzuhur', d.dzuhur)}
      ${d.deskripsi ? `<p style="font-size:12px;margin-top:8px;line-height:1.5;">${escapeHtml(d.deskripsi)}</p>` : ''}
      ${catatan.length ? `<p class="text-muted" style="font-size:11px;margin-top:8px;">${catatan.map(escapeHtml).join(' ')}</p>` : ''}
      <p class="text-muted" style="font-size:11px;margin-top:4px;">Diterbitkan wali kelas${d.diterbitkanPada ? ' · ' + escapeHtml(String(d.diterbitkanPada).slice(0, 10)) : ''}</p></div>`;
  }).join('');
}
function v4PortalSholatIsi(kartu, siswa) {
  if (typeof db === 'undefined' || !db) { kartu.remove(); return; }
  v4PortalSholatBaca(siswa).then(list => {
    const judul = '<p style="font-weight:700;margin-bottom:4px;">🕌 Sholat Dhuha &amp; Dzuhur</p>';
    kartu.innerHTML = judul + (list.length ? v4PortalSholatHtml(list) : '<p class="text-muted" style="font-size:13px;">Rekap semester belum diterbitkan oleh wali kelas.</p>');
  }).catch(e => { console.warn('[SI MAMBA] Kartu sholat Portal Ortu gagal dimuat:', e && e.message || e); kartu.remove(); });
}
let v4PortalSholatObs = null;
function v4PortalSholatPasang(siswa) {
  const content = document.getElementById('portalOrtuContent');
  if (!content || !siswa || !siswa.key) return;
  if (v4PortalSholatObs) { v4PortalSholatObs.disconnect(); v4PortalSholatObs = null; }
  const pasang = () => {
    if (!content.querySelector('.card')) return false;                 // masih "Memuat data..."
    if (content.querySelector('#portalOrtuSholatCard')) return true;
    const kartu = document.createElement('div');
    kartu.className = 'card'; kartu.id = 'portalOrtuSholatCard'; kartu.style.marginBottom = '12px';
    kartu.innerHTML = '<p style="font-weight:700;margin-bottom:4px;">🕌 Sholat Dhuha &amp; Dzuhur</p><p class="text-muted" style="font-size:13px;">⏳ Memuat rekap...</p>';
    const acuan = [...content.querySelectorAll('.card')].find(c => /Kehadiran Bulan Ini/.test(c.textContent));
    if (acuan) acuan.insertAdjacentElement('afterend', kartu); else content.appendChild(kartu);
    v4PortalSholatIsi(kartu, siswa);
    return true;
  };
  if (pasang()) return;
  const obs = v4PortalSholatObs = new MutationObserver(() => { if (pasang()) { obs.disconnect(); if (v4PortalSholatObs === obs) v4PortalSholatObs = null; } });
  obs.observe(content, { childList: true });
  setTimeout(() => { obs.disconnect(); if (v4PortalSholatObs === obs) v4PortalSholatObs = null; }, 60000);
}
(function () {
  if (typeof renderPortalOrtuDashboard !== 'function' || renderPortalOrtuDashboard.__sholatRaport) return;
  const asli = renderPortalOrtuDashboard;
  const baru = function (siswa) {
    const hasil = asli.apply(this, arguments);
    try { v4PortalSholatPasang(siswa); } catch (e) { console.warn('[SI MAMBA] Pasang kartu sholat Portal Ortu gagal:', e); }
    return hasil;
  };
  baru.__sholatRaport = true;
  window.renderPortalOrtuDashboard = baru;
})();
