#!/usr/bin/env node
/* ============================================================
   SI MAMBA - cek-versi.js
   Pemeriksaan SEBELUM deploy: pastikan index.html, sw.js, dan file aset konsisten.

   PEMAKAIAN (jalankan dari folder proyek, tempat index.html & sw.js berada):
     node cek-versi.js              periksa folder saat ini
     node cek-versi.js path/ke/app  periksa folder lain
     node cek-versi.js --simpan     periksa, lalu (kalau tidak ada ERROR) simpan "foto" versi
                                    & isi file ke .cek-versi.json -- jalankan SETELAH deploy

   YANG DIPERIKSA
   ERROR  (exit code 1, deploy sebaiknya dibatalkan)
     1. Aset lokal (js/, css/, vendor/) di index.html yang TIDAK ada di PRECACHE_URLS sw.js
     2. Angka ?v= di index.html berbeda dengan di PRECACHE_URLS
     3. File aset yang dirujuk index.html / sw.js tidak ada di disk
     4. id elemen ganda di index.html
     5. (butuh .cek-versi.json) isi file berubah tapi ?v= SAMA seperti deploy sebelumnya
        -> pengguna PWA akan terus memakai file lama dari cache
   PERINGATAN (exit code tetap 0)
     - File ada di PRECACHE_URLS tapi tidak dimuat index.html (wajar kalau dimuat malas)
     - File dimuat dua kali di index.html
     - APP_VERSION sw.js tidak berubah padahal ada aset yang berubah
     - Aset tanpa ?v= yang isinya berubah
   Tanpa dependensi; hanya butuh Node.js.
============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const simpan = args.includes('--simpan');
const dir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const STATE = path.join(dir, '.cek-versi.json');

const warna = process.stdout.isTTY;
const c = (kode, t) => (warna ? `\x1b[${kode}m${t}\x1b[0m` : t);
const errors = [], warnings = [], infos = [];
const err = m => errors.push(m), warn = m => warnings.push(m), info = m => infos.push(m);

function baca(nama) {
  const p = path.join(dir, nama);
  if (!fs.existsSync(p)) { console.error(c(31, `✖ ${nama} tidak ditemukan di ${dir}`)); process.exit(2); }
  return fs.readFileSync(p, 'utf8');
}
const html = baca('index.html');
const sw = baca('sw.js');

const ASET = /^(?:js|css|vendor)\//;
const norm = u => u.replace(/^\.\//, '');
const base = u => u.split('?')[0];
const ver = u => u.split('?')[1] || '';
const sha = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');

// ---------- index.html: <script src> & <link href> lokal (komentar HTML diabaikan) ----------
const htmlTanpaKomentar = html.replace(/<!--[\s\S]*?-->/g, '');
const dalamIndex = [];                                   // url lengkap sesuai urutan muncul
for (const m of htmlTanpaKomentar.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
  const u = norm(m[1]);
  if (ASET.test(u)) dalamIndex.push(u);
}

// ---------- sw.js: isi PRECACHE_URLS ----------
const blok = /const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\n\s*\];/.exec(sw);
if (!blok) { console.error(c(31, '✖ PRECACHE_URLS tidak ditemukan di sw.js (format berubah?)')); process.exit(2); }
const dalamSw = [];
blok[1].split('\n').forEach(baris => {
  const m = /'([^']+)'/.exec(baris.replace(/\/\/.*$/, ''));
  if (m && ASET.test(norm(m[1]))) dalamSw.push(norm(m[1]));
});

const mapIndex = new Map(), mapSw = new Map();
dalamIndex.forEach(u => { if (mapIndex.has(base(u))) warn(`${base(u)} dimuat dua kali di index.html`); mapIndex.set(base(u), u); });
dalamSw.forEach(u => mapSw.set(base(u), u));

// 1 & 2: index <-> precache
for (const [b, u] of mapIndex) {
  if (!mapSw.has(b)) err(`${u} ada di index.html tapi TIDAK ada di PRECACHE_URLS sw.js`);
  else if (mapSw.get(b) !== u) err(`versi beda: index.html "${u}"  vs  sw.js "${mapSw.get(b)}"`);
}
for (const [b, u] of mapSw) if (!mapIndex.has(b)) warn(`${u} ada di PRECACHE_URLS tapi tidak dimuat index.html (OK kalau dimuat malas)`);

// 3: file ada di disk
new Set([...mapIndex.keys(), ...mapSw.keys()]).forEach(b => {
  if (!fs.existsSync(path.join(dir, b))) err(`file tidak ada di disk: ${b}`);
});

// 4: id ganda
const hitung = {};
for (const m of htmlTanpaKomentar.matchAll(/\bid\s*=\s*"([^"]+)"/g)) hitung[m[1]] = (hitung[m[1]] || 0) + 1;
Object.keys(hitung).filter(k => hitung[k] > 1).forEach(k => err(`id ganda di index.html: "${k}" (${hitung[k]}x)`));

// 5: isi berubah tapi ?v= tetap (butuh .cek-versi.json)
const appVersion = (/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(sw) || [])[1] || '(tidak terbaca)';
info(`APP_VERSION sw.js : ${appVersion}`);
info(`Aset dicek        : ${mapIndex.size} file di index.html, ${mapSw.size} di PRECACHE_URLS`);

const aset = {};
for (const [b, u] of mapIndex) { const p = path.join(dir, b); if (fs.existsSync(p)) aset[b] = { v: ver(u), hash: sha(p) }; }

let prev = null;
if (fs.existsSync(STATE)) { try { prev = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { warn('.cek-versi.json rusak, dilewati'); } }
if (!prev) {
  info('Belum ada .cek-versi.json: deteksi "isi berubah tapi ?v= sama" tidak aktif. Jalankan dengan --simpan setelah deploy.');
} else {
  let adaBerubah = false;
  for (const b of Object.keys(aset)) {
    const p = prev.assets && prev.assets[b];
    if (!p) { adaBerubah = true; continue; }                       // file baru
    if (p.hash === aset[b].hash && p.v === aset[b].v) continue;    // tidak berubah
    adaBerubah = true;
    if (p.hash !== aset[b].hash && p.v === aset[b].v) {
      if (aset[b].v) err(`${b} isinya BERUBAH tapi ?${aset[b].v} masih sama dengan deploy sebelumnya -> naikkan di index.html & sw.js`);
      else warn(`${b} isinya berubah tapi tanpa ?v= (mengandalkan revalidate SW)`);
    }
  }
  if (adaBerubah && prev.appVersion === appVersion) warn(`ada aset yang berubah tapi APP_VERSION masih ${appVersion} -> pertimbangkan menaikkannya di sw.js`);
}

// ---------- laporan ----------
infos.forEach(m => console.log(c(36, 'ℹ ') + m));
warnings.forEach(m => console.log(c(33, '⚠ PERINGATAN: ') + m));
errors.forEach(m => console.log(c(31, '✖ ERROR: ') + m));
if (errors.length) {
  console.log('\n' + c(31, `GAGAL: ${errors.length} error, ${warnings.length} peringatan. Perbaiki sebelum deploy.`));
  if (simpan) console.log(c(33, '(--simpan dilewati karena ada error)'));
  process.exit(1);
}
console.log('\n' + c(32, `✔ OK: index.html, sw.js, dan aset konsisten (${warnings.length} peringatan).`));
if (simpan) {
  fs.writeFileSync(STATE, JSON.stringify({ appVersion, disimpan: new Date().toISOString(), assets: aset }, null, 2) + '\n');
  console.log(c(32, `✔ Foto versi disimpan ke ${path.basename(STATE)} (${Object.keys(aset).length} aset).`));
}
