/* ============================================================
   SI MAMBA - js/data-soal-pancasila-gambar.js
   TAMBAHAN soal bergambar otomatis untuk PENDIDIKAN PANCASILA (sebelumnya belum punya soal bergambar sama sekali).
   Memakai dua jenis gambar baru di js/perangkat-soal.js: [[g:sila;1..5]] (lambang sila) dan [[g:bendera;id|terbalik|biruputih|merahkuning]],
   serta [[g:wajah;...]] yang sudah ada. Gambar lambang sila DISEDERHANAKAN untuk soal (bukan lambang resmi lengkap).
     pp-A-1 Lambang negara dan sila Pancasila : mengenal lambang tiap sila (15 soal)
     pp-B-1 Makna lambang sila Pancasila      : bunyi sila dan makna lambang (13 soal)
     pp-A-5 Identitas bangsa (bendera)        : mengenal bendera Merah Putih (7 soal)
     pp-A-2 Perilaku sesuai Pancasila         : ekspresi wajah dan perbuatan terhadap teman (5 soal)
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban, terutama kalimat makna lambang (rumusan di buku ajar dapat berbeda).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang.
   WAJIB dimuat SESUDAH js/data-soal-lanjutan-umum.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  // Tabel sila: lambang, bunyi sila, dan makna lambang (disederhanakan untuk SD/MI).
  const S = [
    null,
    { lambang: 'bintang', bunyi: 'Ketuhanan Yang Maha Esa', makna: 'bangsa Indonesia percaya dan bertakwa kepada Tuhan Yang Maha Esa' },
    { lambang: 'rantai', bunyi: 'Kemanusiaan yang adil dan beradab', makna: 'manusia saling terhubung dan saling membutuhkan seperti mata rantai' },
    { lambang: 'pohon beringin', bunyi: 'Persatuan Indonesia', makna: 'rakyat bersatu dan bernaung di bawah satu bangsa seperti di bawah pohon yang rindang' },
    { lambang: 'kepala banteng', bunyi: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan', makna: 'keputusan diambil bersama dengan musyawarah, seperti banteng yang suka berkelompok' },
    { lambang: 'padi dan kapas', bunyi: 'Keadilan sosial bagi seluruh rakyat Indonesia', makna: 'kecukupan pangan dan sandang bagi seluruh rakyat' }
  ];
  const g = n => '[[g:sila;' + n + ']]';
  const lain = n => [1, 2, 3, 4, 5].filter(x => x !== n);          // sila selain n (urut tetap)
  const tiga = n => lain(n).slice(0, 3);
  const A1 = [], B1 = [], A5 = [], A2 = [];
  for (let n = 1; n <= 5; n++) {
    const t = tiga(n);
    A1.push(P('L1', 'Lambang sila ke-' + n + ' Pancasila adalah ...', g(n), g(t[0]), g(t[1]), g(t[2])));
    A1.push(P('L1', g(n) + 'Gambar tersebut adalah lambang sila ke-...', 'ke-' + n, 'ke-' + t[0], 'ke-' + t[1], 'ke-' + t[2]));
    B1.push(P('L1', g(n) + 'Lambang pada gambar melambangkan sila ...', S[n].bunyi, S[t[0]].bunyi, S[t[1]].bunyi, S[t[2]].bunyi));
    B1.push(P('L2', g(n) + 'Gambar pada lambang tersebut menggambarkan bahwa ...', S[n].makna, S[t[0]].makna, S[t[1]].makna, S[t[2]].makna));
  }
  A1.push(I('L1', g(1) + 'Lambang bintang pada gambar adalah lambang sila ke- ....', '1 (satu)'));
  A1.push(I('L1', g(3) + 'Lambang pohon beringin pada gambar adalah lambang sila ke- ....', '3 (tiga)'));
  A1.push(I('L1', g(5) + 'Lambang padi dan kapas pada gambar adalah lambang sila ke- ....', '5 (lima)'));
  A1.push(I('L1', g(2) + 'Lambang sila ke-2 Pancasila pada gambar berupa ....', 'rantai'));
  A1.push(I('L1', g(4) + 'Lambang sila ke-4 Pancasila pada gambar berupa ....', 'kepala banteng'));
  [1, 3, 5].forEach(n => B1.push(I('L1', g(n) + 'Sila yang dilambangkan oleh ' + S[n].lambang + ' pada gambar berbunyi ....', S[n].bunyi)));

  A5.push(P('L1', 'Bendera negara Indonesia bernama Sang Saka Merah Putih. Gambar bendera Indonesia adalah ...', '[[g:bendera;id]]', '[[g:bendera;terbalik]]', '[[g:bendera;biruputih]]', '[[g:bendera;merahkuning]]'));
  A5.push(P('L1', '[[g:bendera;id]]Bendera Indonesia pada gambar berwarna merah dan ...', 'putih', 'biru', 'kuning', 'hijau'));
  A5.push(P('L1', '[[g:bendera;id]]Pada bendera Indonesia, warna yang berada di bagian atas adalah ...', 'merah', 'putih', 'biru', 'kuning'));
  A5.push(P('L2', '[[g:bendera;terbalik]]Bendera pada gambar bukan bendera Indonesia karena warna merah berada di bagian ...', 'bawah', 'atas', 'tengah', 'samping'));
  A5.push(P('L2', '[[g:bendera;biruputih]]Bendera pada gambar bukan bendera Indonesia karena bagian atasnya berwarna ...', 'biru', 'merah', 'putih', 'kuning'));
  A5.push(I('L1', '[[g:bendera;id]]Bendera Indonesia pada gambar berwarna merah dan ....', 'putih'));
  A5.push(I('L1', '[[g:bendera;id]]Nama bendera negara Indonesia pada gambar adalah Sang Saka ....', 'Merah Putih'));

  A2.push(P('L1', 'Dina membantu temannya yang kesulitan membawa buku. Perasaan teman Dina setelah dibantu kira-kira seperti pada gambar ...', '[[g:wajah;senang]]', '[[g:wajah;sedih]]', '[[g:wajah;marah]]', '[[g:wajah;takut]]'));
  A2.push(P('L1', 'Rudi mengejek temannya sampai temannya menangis. Perasaan teman Rudi kira-kira seperti pada gambar ...', '[[g:wajah;sedih]]', '[[g:wajah;senang]]', '[[g:wajah;terkejut]]', '[[g:wajah;takut]]'));
  A2.push(P('L1', '[[g:wajah;senang]]Wajah pada gambar menunjukkan perasaan senang. Perbuatan yang membuat teman merasa senang adalah ...', 'berbagi bekal dengan teman', 'mengambil mainan tanpa izin', 'mengejek teman', 'tidak mau bermain dengan teman'));
  A2.push(P('L1', '[[g:wajah;sedih]]Wajah pada gambar menunjukkan perasaan sedih. Perbuatan yang dapat membuat teman sedih adalah ...', 'mengejek teman', 'meminjamkan pensil', 'mengucapkan terima kasih', 'menolong teman'));
  A2.push(I('L1', '[[g:wajah;marah]]Kita tidak boleh berkata kasar karena dapat membuat teman merasa seperti pada gambar, yaitu ....', 'marah'));

  const TAMBAH = { 'pp-A-1': A1, 'pp-B-1': B1, 'pp-A-5': A5, 'pp-A-2': A2 };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
