// ============================================================
// ANGKET KURIKULUM: Pembelajaran Mendalam & Kurikulum Berbasis Cinta
// Dimuat SESUDAH app.js (memakai global: db, currentUser, ROLES, toast, escapeHtml).
//
// Halaman staf (menu "Angket Kurikulum"):
//   - Guru / Wali Kelas  -> mengisi angket Guru (43 butir, Bagian A-E + 6 pertanyaan terbuka).
//   - Kepala Madrasah    -> mengisi angket Kepala/Waka Kurikulum (16 butir).
//   - Guru yang menjabat Waka Kurikulum boleh memilih "Isi sebagai: Kepala/Waka".
//   - Admin & Kepala Madrasah -> tab "Rekap" (rata-rata per bagian, kategori, jawaban terbuka, ekspor CSV).
//
// Tombol ON/OFF: Admin & Kepala Madrasah membuka/menutup angket di bagian atas halaman. Status disimpan di
//   angket_kurikulum_status = { aktif:true|false, periode:'2026-1', diubahOleh, tgl }.
//   Selama OFF, form tidak tampil & tidak bisa dikirim (guru, kepala, ortu, siswa). Rekap tetap bisa dilihat.
//
// Data Firebase:  angket_kurikulum/{periode}/{jenis}/{kunciResponden}
//   = { nama, jenis, periode, tgl, jawaban:{A1:3,...}, terbuka:{T1:'...'} }
//   jenis: guru | kepala | ortu | siswa.   periode: "2026-1" (Ganjil Jul-Des) / "2026-2" (Genap Jan-Jun).
//
// Portal Orang Tua / siswa memakai API global (portal-ortu.js tinggal memanggilnya):
//   AngketKurikulum.renderForm(idWadah, 'ortu', { kunci, nama }, { izinAnonim:true })  -> sudah dipasang di js/portal-ortu.js
// CATATAN: Rules Firebase harus mengizinkan tulis ke angket_kurikulum (lihat angket-kurikulum.rules.json).
// ============================================================
(function () {
  'use strict';

  var SKALA = ['Tidak Pernah / Sangat Tidak Setuju', 'Jarang / Tidak Setuju', 'Sering / Setuju', 'Selalu / Sangat Setuju'];
  var BAGIAN = { A: 'A. Visi, Misi & Arah Kurikulum', B: 'B. Pembelajaran Mendalam', C: 'C. Nilai-Nilai Cinta', D: 'D. Ekosistem Pendukung', E: 'E. Asesmen' };

  // [kode, bagian, teks, dibalik?]
  var BUTIR = {
    guru: [
      ['A1','A','Saya memahami visi dan misi madrasah dengan baik.'],
      ['A2','A','Visi dan misi madrasah disosialisasikan secara rutin kepada guru.'],
      ['A3','A','Nilai-nilai cinta (kepada Allah dan Rasul-Nya, ilmu, lingkungan, diri dan sesama, tanah air) tercermin dalam visi dan misi madrasah.'],
      ['A4','A','Visi dan misi madrasah menjadi acuan saya dalam merancang pembelajaran.'],
      ['A5','A','Praktik pembelajaran di kelas saya sejalan dengan visi dan misi madrasah.'],
      ['A6','A','Madrasah mengevaluasi secara berkala keterlaksanaan visi dan misi dalam pembelajaran.'],
      ['B1','B','[Mindful] Saya menyampaikan tujuan pembelajaran dan alasan mempelajari materi di awal pembelajaran.'],
      ['B2','B','[Mindful] Saya mengajak peserta didik menyadari proses berpikir dan cara belajarnya sendiri.'],
      ['B3','B','[Mindful] Saya memberi ruang bagi peserta didik untuk fokus, bertanya, dan merenungkan materi.'],
      ['B4','B','[Meaningful] Saya mengaitkan materi dengan pengalaman dan kehidupan nyata peserta didik.'],
      ['B5','B','[Meaningful] Saya mendorong peserta didik memahami konsep, bukan sekadar menghafal.'],
      ['B6','B','[Meaningful] Saya memberi tugas atau projek yang menuntut penerapan pengetahuan untuk memecahkan masalah.'],
      ['B7','B','[Joyful] Saya menggunakan metode dan media bervariasi agar peserta didik antusias belajar.'],
      ['B8','B','[Joyful] Suasana kelas saya aman, hangat, dan bebas dari rasa takut salah.'],
      ['B9','B','[Joyful] Peserta didik aktif terlibat (berdiskusi, berkolaborasi, mencoba) selama pembelajaran.'],
      ['C1','C','[Cinta Allah & Rasul] Saya mengaitkan materi dengan keimanan, rasa syukur, dan keteladanan Rasulullah.'],
      ['C2','C','[Cinta Allah & Rasul] Saya membiasakan doa, dzikir, atau refleksi spiritual dalam pembelajaran.'],
      ['C3','C','[Cinta Ilmu] Saya menumbuhkan rasa ingin tahu dan semangat mencari ilmu pada peserta didik.'],
      ['C4','C','[Cinta Ilmu] Saya membiasakan peserta didik membaca, meneliti, dan bertanya secara kritis.'],
      ['C5','C','[Cinta Lingkungan] Saya mengaitkan materi dengan kepedulian terhadap kebersihan dan kelestarian lingkungan.'],
      ['C6','C','[Cinta Lingkungan] Saya melibatkan peserta didik dalam aksi nyata menjaga lingkungan madrasah.'],
      ['C7','C','[Cinta Diri & Sesama] Saya menumbuhkan sikap saling menghargai, empati, dan kerja sama.'],
      ['C8','C','[Cinta Diri & Sesama] Saya membantu peserta didik mengenali potensi dan menghargai dirinya sendiri.'],
      ['C9','C','[Cinta Tanah Air] Saya mengaitkan materi dengan nilai kebangsaan, kebinekaan, dan kebanggaan sebagai bangsa Indonesia.'],
      ['C10','C','[Cinta Tanah Air] Saya memberi contoh dan kegiatan yang menumbuhkan semangat berkontribusi bagi bangsa dan masyarakat.'],
      ['D1','D','[Guru] Saya punya kompetensi dan kesempatan pengembangan diri (pelatihan, KKG/MGMP) untuk menerapkan pembelajaran mendalam.'],
      ['D2','D','[Guru] Beban kerja dan administrasi tidak menghambat saya merancang pembelajaran yang bermakna.'],
      ['D3','D','[Peserta didik] Peserta didik memiliki motivasi dan kesiapan belajar yang baik.'],
      ['D4','D','[Kepala madrasah] Kepala madrasah memberi dukungan, supervisi, dan umpan balik yang membangun.'],
      ['D5','D','[Kepala madrasah] Kebijakan madrasah mendorong inovasi pembelajaran dan penerapan Kurikulum Berbasis Cinta.'],
      ['D6','D','[Orang tua] Orang tua mendukung proses belajar dan pembiasaan nilai di rumah.'],
      ['D7','D','[Orang tua] Ada komunikasi yang baik antara guru dan orang tua tentang perkembangan peserta didik.'],
      ['D8','D','[Sarana prasarana] Sarana, media, dan sumber belajar di madrasah memadai untuk pembelajaran mendalam.'],
      ['D9','D','[Budaya madrasah] Budaya madrasah (keteladanan, kolaborasi, saling menghargai) mendukung tumbuhnya nilai-nilai cinta.'],
      ['E1','E','Asesmen yang saya gunakan mengukur pemahaman dan penalaran, bukan hanya hafalan.'],
      ['E2','E','Saya menggunakan beragam bentuk asesmen (tes, observasi, penugasan, unjuk kerja).'],
      ['E3','E','Saya menggunakan asesmen projek atau portofolio untuk menilai kemampuan peserta didik.'],
      ['E4','E','Saya menilai sikap dan nilai (akhlak, empati, tanggung jawab) secara terencana dengan instrumen yang jelas.'],
      ['E5','E','Asesmen saya mampu menggambarkan perkembangan nilai-nilai cinta pada peserta didik.'],
      ['E6','E','Saya memberi kesempatan peserta didik melakukan refleksi diri atas proses belajarnya.'],
      ['E7','E','Saya memberikan umpan balik yang membangun, bukan hanya nilai angka.'],
      ['E8','E','Hasil asesmen saya gunakan untuk memperbaiki proses pembelajaran berikutnya.'],
      ['E9','E','Asesmen di madrasah saat ini masih didominasi tes tertulis. (butir negatif, skor dibalik)', true]
    ],
    kepala: [
      ['K1','A','Visi dan misi madrasah memuat nilai-nilai cinta (kepada Allah dan Rasul-Nya, ilmu, lingkungan, diri dan sesama, tanah air).'],
      ['K2','A','Visi dan misi madrasah dijabarkan ke dalam program dan kurikulum operasional madrasah.'],
      ['K3','A','Madrasah mengevaluasi berkala keterlaksanaan visi dan misi dalam pembelajaran di kelas.'],
      ['K4','B','Madrasah memiliki program pelatihan atau pendampingan guru tentang Pembelajaran Mendalam.'],
      ['K5','B','Saya melakukan supervisi yang menilai kebermaknaan dan keterlibatan peserta didik, bukan hanya kelengkapan administrasi.'],
      ['K6','B','Guru mendapat umpan balik yang membangun dari hasil supervisi.'],
      ['K7','C','Madrasah memiliki program atau pembiasaan yang menumbuhkan nilai-nilai cinta.'],
      ['K8','C','Nilai-nilai cinta diintegrasikan dalam perencanaan pembelajaran semua mata pelajaran, bukan hanya mapel agama.'],
      ['K9','D','Kebijakan dan anggaran madrasah mendukung inovasi pembelajaran.'],
      ['K10','D','Sarana, media, dan sumber belajar memadai untuk pembelajaran mendalam.'],
      ['K11','D','Madrasah menjalin komunikasi dan kerja sama yang baik dengan orang tua.'],
      ['K12','D','Budaya madrasah (keteladanan, kolaborasi, saling menghargai) mendukung Kurikulum Berbasis Cinta.'],
      ['K13','E','Kebijakan asesmen madrasah mendorong penilaian yang tidak hanya berupa tes tertulis.'],
      ['K14','E','Madrasah mendorong guru menggunakan projek, portofolio, dan refleksi diri peserta didik.'],
      ['K15','E','Perkembangan sikap dan nilai peserta didik dipantau dan dilaporkan secara terencana.'],
      ['K16','E','Asesmen di madrasah masih didominasi tes tertulis yang mengukur hafalan. (butir negatif, skor dibalik)', true]
    ],
    ortu: [
      ['O1','A','Saya mengetahui visi dan misi madrasah tempat anak saya belajar.'],
      ['O2','A','Madrasah menyampaikan program dan arah pendidikan kepada orang tua (rapat, buku penghubung, grup komunikasi).'],
      ['O3','B','Anak saya bersemangat dan senang berangkat serta belajar di madrasah.'],
      ['O4','B','Anak saya bisa menceritakan apa yang dipelajari dan menghubungkannya dengan kehidupan sehari-hari.'],
      ['O5','C','Anak saya menunjukkan perkembangan dalam ibadah, doa, dan kecintaan kepada Allah dan Rasul-Nya.'],
      ['O6','C','Anak saya gemar belajar, membaca, dan bertanya.'],
      ['O7','C','Anak saya peduli kebersihan dan lingkungan, termasuk di rumah.'],
      ['O8','C','Anak saya menunjukkan sikap menghargai, empati, dan suka membantu orang lain.'],
      ['O9','C','Anak saya menunjukkan kebanggaan dan kepedulian sebagai bagian dari bangsa Indonesia.'],
      ['O10','D','Saya mendampingi dan menanyakan perkembangan belajar anak di rumah.'],
      ['O11','D','Saya membiasakan nilai-nilai yang diajarkan madrasah (ibadah, kejujuran, kepedulian) di rumah.'],
      ['O12','D','Guru dan madrasah mudah dihubungi dan terbuka terhadap masukan orang tua.'],
      ['O13','D','Saya menerima laporan perkembangan anak yang jelas, tidak hanya berupa nilai angka.'],
      ['O14','E','Saya memahami cara madrasah menilai anak (tugas, projek, praktik, sikap), tidak hanya ujian tertulis.'],
      ['O15','D','Lingkungan madrasah aman, ramah, dan memberi keteladanan yang baik bagi anak.']
    ],
    siswa: [
      ['S1','B','Guru menjelaskan apa yang akan dipelajari dan untuk apa kita mempelajarinya.'],
      ['S2','B','Aku diberi waktu untuk berpikir, bertanya, dan merenungkan pelajaran.'],
      ['S3','B','Aku mengerti hubungan pelajaran dengan kehidupan sehari-hariku.'],
      ['S4','B','Aku diminta memahami dan menerapkan pelajaran, bukan hanya menghafal.'],
      ['S5','B','Belajar di kelas terasa menyenangkan.'],
      ['S6','B','Aku berani bertanya atau menjawab tanpa takut salah atau ditertawakan.'],
      ['S7','B','Aku ikut aktif berdiskusi, bekerja sama, atau mengerjakan projek bersama teman.'],
      ['S8','C','Guru mengaitkan pelajaran dengan iman, rasa syukur, dan teladan Rasulullah.'],
      ['S9','C','Guru membuatku semangat mencari tahu dan suka belajar.'],
      ['S10','C','Aku diajak menjaga kebersihan dan kelestarian lingkungan madrasah.'],
      ['S11','C','Di kelas, kami diajarkan untuk saling menghargai, peduli, dan membantu teman.'],
      ['S12','C','Aku diajak mencintai dan bangga sebagai bagian dari bangsa Indonesia.'],
      ['S13','E','Penilaianku tidak hanya ujian tertulis, tetapi juga tugas, projek, atau praktik.'],
      ['S14','E','Aku diberi kesempatan menilai dan merenungkan perkembangan belajarku sendiri.'],
      ['S15','E','Guru memberi masukan yang membantuku menjadi lebih baik, bukan hanya nilai.']
    ]
  };

  var TERBUKA = {
    guru: [
      'Nilai cinta apa yang paling sudah terlihat dalam pembelajaran di madrasah ini? Berikan contohnya.',
      'Nilai cinta apa yang paling perlu diperkuat? Mengapa?',
      'Apa kesenjangan terbesar antara visi madrasah dan praktik pembelajaran sehari-hari?',
      'Apa faktor pendukung dan penghambat utama yang Anda alami dalam menerapkan pembelajaran mendalam?',
      'Bentuk asesmen apa yang paling sesuai untuk mengukur perubahan cara berpikir, bersikap, dan bertindak peserta didik?',
      'Dukungan atau pelatihan apa yang Anda butuhkan agar dapat menerapkan pembelajaran mendalam berbasis cinta secara optimal?'
    ],
    kepala: [
      'Apa kesenjangan terbesar antara visi madrasah dan praktik pembelajaran saat ini?',
      'Apa faktor pendukung dan penghambat utama penerapan Pembelajaran Mendalam dan Kurikulum Berbasis Cinta?',
      'Dukungan apa yang dibutuhkan madrasah untuk memperkuat penerapannya?'
    ],
    ortu: [
      'Perubahan positif apa yang Bapak/Ibu lihat pada anak sejak belajar di madrasah ini?',
      'Hal apa yang masih perlu diperbaiki dalam pembelajaran atau komunikasi madrasah?',
      'Bagaimana Bapak/Ibu bersedia berperan mendukung pembelajaran dan pembiasaan nilai di rumah?'
    ],
    siswa: [
      'Hal apa di kelas yang paling kamu sukai?',
      'Hal apa yang membuatmu kurang semangat atau sulit belajar?',
      'Bagaimana cara guru mengajar atau menilai yang kamu harapkan?'
    ]
  };

  var JUDUL = { guru: 'Angket Guru', kepala: 'Angket Kepala Madrasah / Waka Kurikulum', ortu: 'Angket Orang Tua / Wali', siswa: 'Angket Peserta Didik' };

  // ---------- util ----------
  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function periodeSekarang() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() >= 6 ? '1' : '2'); }
  function labelPeriode(p) { var a = String(p).split('-'); return (a[1] === '1' ? 'Ganjil' : 'Genap') + ' ' + a[0]; }
  function aman(k) { return String(k || '').replace(/[.#$\[\]\/]/g, '_'); }
  function kategori(r) { return r >= 3.26 ? 'Sangat Baik' : r >= 2.51 ? 'Baik' : r >= 1.76 ? 'Cukup' : 'Kurang'; }
  function skorButir(b, v) { return b[3] ? (5 - v) : v; }

  var CSS = '' +
    '.akq-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}' +
    '.akq-tab{padding:7px 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;font-size:13px;cursor:pointer;}' +
    '.akq-tab.on{background:#047857;color:#fff;border-color:#047857;}' +
    '.akq-grup{margin:16px 0 6px;font-weight:700;font-size:14px;color:#065f46;}' +
    '.akq-butir{padding:10px 0;border-bottom:1px solid #f3f4f6;}' +
    '.akq-teks{font-size:13px;margin-bottom:6px;}' +
    '.akq-opsi{display:flex;gap:6px;flex-wrap:wrap;}' +
    '.akq-opsi label{flex:1 1 60px;min-width:56px;text-align:center;border:1px solid #d1d5db;border-radius:8px;padding:6px 4px;font-size:12px;cursor:pointer;}' +
    '.akq-opsi input{display:none;}' +
    '.akq-opsi label:has(input:checked){background:#047857;color:#fff;border-color:#047857;}' +
    '.akq-skala{font-size:11px;color:#6b7280;margin:6px 0 10px;line-height:1.5;}' +
    '.akq-ta{width:100%;min-height:64px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:13px;box-sizing:border-box;}' +
    '.akq-tbl{width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;}' +
    '.akq-tbl th,.akq-tbl td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}' +
    '.akq-tbl th{background:#f0fdf4;}' +
    '.akq-scroll{overflow-x:auto;}';
  function pasangCss() {
    if (el('akqCss')) return;
    var s = document.createElement('style'); s.id = 'akqCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------- status ON/OFF ----------
  var STATUS_PATH = 'angket_kurikulum_status';
  function bacaStatus() {
    return db.ref(STATUS_PATH).once('value').then(function (sn) {
      var v = sn.val() || {};
      return { aktif: v.aktif === true, periode: v.periode || periodeSekarang(), tgl: v.tgl || '', diubahOleh: v.diubahOleh || '' };
    }, function () { return { aktif: false, periode: periodeSekarang(), tgl: '', diubahOleh: '', gagal: true }; });
  }
  function aturStatus(aktif) {
    return bacaStatus().then(function (lama) {
      var data = { aktif: !!aktif, periode: aktif ? periodeSekarang() : lama.periode, diubahOleh: (currentUser && currentUser.name) || '', tgl: new Date().toISOString() };
      return db.ref(STATUS_PATH).set(data).then(function () { return data; });
    });
  }
  function htmlTutup() {
    return '<div style="padding:18px;border:1px dashed #d1d5db;border-radius:10px;text-align:center;color:#6b7280;font-size:13px;">' +
      '<div style="font-size:26px;">🔒</div><b>Angket belum dibuka.</b><br>Angket akan bisa diisi setelah dibuka oleh Admin atau Kepala Madrasah.</div>';
  }

  // ---------- form ----------
  function htmlForm(jenis, pre) {
    var h = '<div class="akq-skala">Skala: 1 = ' + esc(SKALA[0]) + ' &nbsp;|&nbsp; 2 = ' + esc(SKALA[1]) + ' &nbsp;|&nbsp; 3 = ' + esc(SKALA[2]) + ' &nbsp;|&nbsp; 4 = ' + esc(SKALA[3]) + '. Jawablah sesuai kondisi yang SEBENARNYA terjadi.</div>';
    var last = '';
    BUTIR[jenis].forEach(function (b) {
      if (b[1] !== last) { h += '<div class="akq-grup">' + esc(BAGIAN[b[1]]) + '</div>'; last = b[1]; }
      var cur = pre && pre.jawaban ? pre.jawaban[b[0]] : null;
      h += '<div class="akq-butir"><div class="akq-teks"><b>' + esc(b[0]) + '.</b> ' + esc(b[2]) + '</div><div class="akq-opsi">';
      for (var i = 1; i <= 4; i++) h += '<label><input type="radio" name="akq_' + esc(b[0]) + '" value="' + i + '"' + (cur === i ? ' checked' : '') + '> ' + i + '</label>';
      h += '</div></div>';
    });
    h += '<div class="akq-grup">Pertanyaan Terbuka</div>';
    TERBUKA[jenis].forEach(function (q, i) {
      var v = pre && pre.terbuka ? (pre.terbuka['T' + (i + 1)] || '') : '';
      h += '<div class="akq-butir"><div class="akq-teks">' + (i + 1) + '. ' + esc(q) + '</div><textarea class="akq-ta" id="akq_T' + (i + 1) + '_' + jenis + '" maxlength="600">' + esc(v) + '</textarea></div>';
    });
    return h;
  }

  function bacaForm(jenis) {
    var jawaban = {}, kosong = [];
    BUTIR[jenis].forEach(function (b) {
      var r = document.querySelector('input[name="akq_' + b[0] + '"]:checked');
      if (r) jawaban[b[0]] = parseInt(r.value, 10); else kosong.push(b[0]);
    });
    var terbuka = {};
    TERBUKA[jenis].forEach(function (q, i) { var t = el('akq_T' + (i + 1) + '_' + jenis); if (t && t.value.trim()) terbuka['T' + (i + 1)] = t.value.trim().slice(0, 600); });
    return { jawaban: jawaban, terbuka: terbuka, kosong: kosong };
  }

  // Simpan jawaban. Satu responden satu data per periode (mengisi ulang = memperbarui).
  function kirim(jenis, resp, periode) {
    var f = bacaForm(jenis);
    if (f.kosong.length) { toast('Masih ada ' + f.kosong.length + ' butir belum dijawab (mulai dari ' + f.kosong[0] + ').', true); return Promise.resolve(false); }
    return bacaStatus().then(function (st) {
      if (!st.aktif) { toast('Angket sedang ditutup. Hubungi Admin atau Kepala Madrasah.', true); return false; }
      periode = periode || st.periode;
      var data = { nama: resp.nama || '', jenis: jenis, periode: periode, tgl: new Date().toISOString(), jawaban: f.jawaban, terbuka: f.terbuka };
      if (resp.anonim) data.nama = '';
      return db.ref('angket_kurikulum/' + periode + '/' + jenis + '/' + aman(resp.kunci)).set(data).then(function () {
        toast('Terima kasih, angket berhasil dikirim.'); try { updateNotif(true); } catch (e) {} return true;
      }).catch(function (e) {
        toast('Gagal mengirim angket: ' + (e && e.message ? e.message : e), true); return false;
      });
    });
  }

  // Dipakai portal ortu/siswa & halaman staf.
  function renderForm(idWadah, jenis, resp, opsi) {
    pasangCss();
    var w = el(idWadah); if (!w || !BUTIR[jenis]) return;
    opsi = opsi || {};
    w.innerHTML = 'Memuat...';
    bacaStatus().then(function (st) {
      if (!st.aktif) { w.innerHTML = htmlTutup(); return; }
      var periode = opsi.periode || st.periode;
      w.innerHTML = '<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Periode: <b>' + esc(labelPeriode(periode)) + '</b>. Jawaban dijaga kerahasiaannya dan hanya dipakai untuk perbaikan pembelajaran.</div><div id="akqFormIsi_' + jenis + '">Memuat...</div>';
      db.ref('angket_kurikulum/' + periode + '/' + jenis + '/' + aman(resp.kunci)).once('value').then(function (sn) { return sn.val(); }, function () { return null; }).then(function (pre) {
        var isi = el('akqFormIsi_' + jenis); if (!isi) return;
        var ada = !!pre;
        isi.innerHTML = (ada ? '<div class="akq-skala" style="color:#047857;">Anda sudah mengisi angket ini pada ' + esc(new Date(pre.tgl).toLocaleDateString('id-ID')) + '. Mengirim lagi akan memperbarui jawaban sebelumnya.</div>' : '') +
          htmlForm(jenis, pre) + (opsi.izinAnonim ? '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:12px;cursor:pointer;"><input type="checkbox" id="akqAnonim_' + jenis + '"> Kirim sebagai anonim (nama tidak disertakan)</label>' : '') + '<div style="margin-top:14px;"><button class="btn btn-primary" id="akqKirim_' + jenis + '" type="button">' + (ada ? 'Perbarui Jawaban' : 'Kirim Angket') + '</button></div>';
        el('akqKirim_' + jenis).addEventListener('click', function () {
          var b = this; b.disabled = true;
          var an = el('akqAnonim_' + jenis); var resp2 = { kunci: resp.kunci, nama: resp.nama, anonim: an ? an.checked : !!resp.anonim };
          kirim(jenis, resp2, periode).then(function (ok) { b.disabled = false; if (ok) renderForm(idWadah, jenis, resp, opsi); });
        });
      });
    });
  }

  // ---------- rekap ----------
  function hitung(jenis, daftar) {
    var tot = {}, n = {};
    daftar.forEach(function (r) {
      BUTIR[jenis].forEach(function (b) {
        var v = r.jawaban && r.jawaban[b[0]]; if (!v) return;
        var g = b[1]; tot[g] = (tot[g] || 0) + skorButir(b, v); n[g] = (n[g] || 0) + 1;
      });
    });
    var out = {}; Object.keys(BAGIAN).forEach(function (g) { out[g] = n[g] ? tot[g] / n[g] : null; });
    return out;
  }

  var dataRekap = {}, teksIngat = '';
  function renderRekap() {
    var w = el('akqRekapIsi'); if (!w) return;
    var periode = (el('akqPeriode') || {}).value || periodeSekarang();
    w.innerHTML = 'Memuat rekap...';
    db.ref('angket_kurikulum/' + periode).once('value').then(function (snap) {
      var v = snap.val() || {}; dataRekap = {};
      var h = '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Responden</th><th>Jumlah</th>' + Object.keys(BAGIAN).map(function (g) { return '<th>' + esc(BAGIAN[g].split('. ')[1]) + '</th>'; }).join('') + '</tr>';
      var adaData = false;
      ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
        var daftar = Object.keys(v[j] || {}).map(function (k) { return v[j][k]; });
        dataRekap[j] = daftar;
        var avg = hitung(j, daftar);
        h += '<tr><td>' + esc(JUDUL[j]) + '</td><td>' + daftar.length + '</td>' + Object.keys(BAGIAN).map(function (g) {
          return '<td>' + (avg[g] == null ? '-' : avg[g].toFixed(2) + ' (' + kategori(avg[g]) + ')') + '</td>';
        }).join('') + '</tr>';
        if (daftar.length) adaData = true;
      });
      var sudahKey = {}; ['guru', 'kepala'].forEach(function (j) { Object.keys(v[j] || {}).forEach(function (k) { sudahKey[k] = 1; }); });
      var semuaGuru = (typeof allGuru !== 'undefined' && allGuru && allGuru.length) ? allGuru : [];
      var belumList = semuaGuru.filter(function (g) { return !sudahKey[aman(g.key)]; });
      var progHtml = '';
      if (semuaGuru.length) {
        var sudahN = semuaGuru.length - belumList.length, pct = Math.round(sudahN / semuaGuru.length * 100);
        progHtml = '<div style="margin:6px 0 12px;"><div style="font-size:13px;margin-bottom:4px;"><b>Kemajuan pengisian guru: ' + sudahN + ' dari ' + semuaGuru.length + ' (' + pct + '%)</b></div>' +
          '<div style="height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;"><div style="height:8px;width:' + pct + '%;background:#047857;"></div></div>';
        if (belumList.length) {
          progHtml += '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:13px;">Belum mengisi (' + belumList.length + ')</summary><ul style="font-size:12px;margin:6px 0 6px 18px;">' +
            belumList.map(function (g) { return '<li>' + esc(g.name) + '</li>'; }).join('') + '</ul><button class="btn btn-soft" id="akqSalin" type="button">Salin pesan pengingat</button></details>';
        } else progHtml += '<div style="font-size:12px;color:#047857;margin-top:6px;">Semua guru sudah mengisi. Alhamdulillah.</div>';
        progHtml += '</div>';
      }
      teksIngat = "Assalamu'alaikum Bapak/Ibu guru. Angket Kurikulum (Pembelajaran Mendalam & Kurikulum Berbasis Cinta) periode " + labelPeriode(periode) +
        ' sudah dibuka di SiMamba, menu Angket Kurikulum. Mohon segera diisi. Yang belum mengisi: ' + belumList.map(function (g) { return g.name; }).join(', ') + '. Terima kasih.';
      h += '</table></div><div class="akq-skala">Kategori: 3,26-4,00 Sangat Baik | 2,51-3,25 Baik | 1,76-2,50 Cukup | 1,00-1,75 Kurang. Butir negatif (E9, K16) otomatis dibalik. Rata-rata dihitung per butir terjawab.</div>';
      if (!adaData) h += '<p style="font-size:13px;color:#6b7280;">Belum ada jawaban pada periode ini.</p>';
      else {
        h += '<div style="margin:8px 0;"><button class="btn btn-soft" id="akqCsv" type="button">Unduh CSV</button></div>';
        h += '<div class="akq-grup">Jawaban Terbuka</div>';
        ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
          var item = [];
          dataRekap[j].forEach(function (r) { Object.keys(r.terbuka || {}).forEach(function (t) { item.push([t, r.terbuka[t]]); }); });
          if (!item.length) return;
          h += '<details style="margin:6px 0;"><summary style="cursor:pointer;font-size:13px;">' + esc(JUDUL[j]) + ' (' + item.length + ' jawaban)</summary>';
          TERBUKA[j].forEach(function (q, i) {
            var isi = item.filter(function (x) { return x[0] === 'T' + (i + 1); });
            if (!isi.length) return;
            h += '<div style="font-size:12px;font-weight:600;margin:8px 0 2px;">' + (i + 1) + '. ' + esc(q) + '</div><ul style="font-size:12px;margin:0 0 4px 18px;">' + isi.map(function (x) { return '<li>' + esc(x[1]) + '</li>'; }).join('') + '</ul>';
          });
          h += '</details>';
        });
      }
      w.innerHTML = progHtml + h;
      var sl = el('akqSalin'); if (sl) sl.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teksIngat).then(function () { toast('Pesan pengingat disalin.'); }, function () { toast('Gagal menyalin pesan.', true); });
        else toast('Peramban tidak mendukung salin otomatis.', true);
      });
      var b = el('akqCsv'); if (b) b.addEventListener('click', function () { unduhCsv(periode); });
    }, function (e) { w.innerHTML = '<p style="color:#b91c1c;font-size:13px;">Tidak bisa membaca data (' + esc(e && e.message) + '). Periksa Rules Firebase untuk angket_kurikulum.</p>'; });
  }

  function unduhCsv(periode) {
    var baris = [['periode', 'jenis', 'nama', 'tanggal', 'butir', 'skor_mentah', 'skor_olah']];
    ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
      (dataRekap[j] || []).forEach(function (r) {
        BUTIR[j].forEach(function (b) {
          var v = r.jawaban && r.jawaban[b[0]]; if (!v) return;
          baris.push([periode, j, r.nama || '(anonim)', (r.tgl || '').slice(0, 10), b[0], v, skorButir(b, v)]);
        });
      });
    });
    var csv = baris.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'angket-kurikulum-' + periode + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- pengingat: titik menu + kartu Dashboard ----------
  var notifTerakhir = 0;
  function sembunyiPengingat() {
    var d = el('angketNotifDot'); if (d) d.classList.remove('show');
    var c = el('angketDashCard'); if (c) c.innerHTML = '';
  }
  function updateNotif(paksa) {
    if (typeof currentUser === 'undefined' || !currentUser || currentUser.role === ROLES.ADMIN) { sembunyiPengingat(); return; }
    var now = Date.now();
    if (!paksa && now - notifTerakhir < 20000) return;
    notifTerakhir = now;
    var kunci = aman(currentUser.key || currentUser.name);
    bacaStatus().then(function (st) {
      if (!st.aktif) { sembunyiPengingat(); return; }
      var cek = function (j) { return db.ref('angket_kurikulum/' + st.periode + '/' + j + '/' + kunci).once('value').then(function (x) { return x.exists(); }, function () { return false; }); };
      return Promise.all([cek('guru'), cek('kepala')]).then(function (r) {
        var belum = !(r[0] || r[1]);
        var d = el('angketNotifDot'); if (d) d.classList.toggle('show', belum);
        var c = el('angketDashCard'); if (!c) return;
        if (!belum) { c.innerHTML = ''; return; }
        c.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:12px 14px;border-radius:12px;border:1px solid #a7f3d0;background:#ecfdf5;">' +
          '<div style="flex:1;min-width:180px;font-size:13px;"><b>📝 Angket Kurikulum sudah dibuka</b><br><span style="font-size:12px;color:#065f46;">Periode ' + esc(labelPeriode(st.periode)) + '. Mohon isi, hanya sekitar 10 menit.</span></div>' +
          '<button type="button" class="btn btn-primary" id="angketDashBtn">Isi Sekarang</button></div>';
        var b = el('angketDashBtn'); if (b) b.addEventListener('click', function () { if (typeof navigateTo === 'function') navigateTo('angket-kurikulum'); });
      });
    }).catch(function () {});
  }

  // ---------- halaman staf ----------
  function bolehRekap() { return typeof currentUser !== 'undefined' && currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.HEADMASTER); }
  function jenisAwal() { return currentUser && currentUser.role === ROLES.HEADMASTER ? 'kepala' : 'guru'; }

  function setupPage() {
    pasangCss();
    var p = el('page-angket-kurikulum'); if (!p || !currentUser) return;
    var isiAngket = currentUser.role !== ROLES.ADMIN; // Admin hanya melihat rekap
    var jenis = jenisAwal();
    var h = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📝 Angket Kurikulum</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Pembelajaran Mendalam &amp; Kurikulum Berbasis Cinta. Isian Anda membantu madrasah menyusun perbaikan.</p>' +
      (bolehRekap() ? '<div id="akqStatus" style="margin-bottom:12px;"></div>' : '') +
      '<div class="akq-tabs">' + (isiAngket ? '<button type="button" class="akq-tab on" data-tab="isi">Isi Angket</button>' : '') +
      (bolehRekap() ? '<button type="button" class="akq-tab' + (isiAngket ? '' : ' on') + '" data-tab="rekap">Rekap</button>' : '') + '</div>' +
      '<div id="akqTabIsi"' + (isiAngket ? '' : ' class="hidden"') + '>';
    if (isiAngket && currentUser.role !== ROLES.HEADMASTER) {
      h += '<div style="font-size:13px;margin-bottom:8px;">Isi sebagai: <select id="akqJenis"><option value="guru">Guru</option><option value="kepala">Kepala / Waka Kurikulum</option></select></div>';
    }
    h += '<div id="akqWadahForm"></div></div>' +
      '<div id="akqTabRekap" class="hidden"><div style="font-size:13px;margin-bottom:8px;">Periode: <select id="akqPeriode"></select></div><div id="akqRekapIsi"></div></div></div>';
    p.innerHTML = h;

    function muatForm() {
      var jj = el('akqJenis') ? el('akqJenis').value : jenis;
      renderForm('akqWadahForm', jj, { kunci: currentUser.key || currentUser.name, nama: currentUser.name });
    }
    function renderStatus() {
      var w = el('akqStatus'); if (!w) return;
      bacaStatus().then(function (st) {
        var on = st.aktif;
        w.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;border:1px solid ' + (on ? '#a7f3d0' : '#e5e7eb') + ';background:' + (on ? '#ecfdf5' : '#f9fafb') + ';">' +
          '<div style="flex:1;min-width:180px;font-size:13px;"><b>Status angket: ' + (on ? 'DIBUKA' : 'DITUTUP') + '</b><br><span style="font-size:12px;color:#6b7280;">' +
          (on ? 'Periode ' + esc(labelPeriode(st.periode)) + '. Guru dapat mengisi.' : 'Guru belum bisa mengisi. Tekan tombol untuk memulai.') +
          (st.tgl ? '<br>Diubah ' + esc(new Date(st.tgl).toLocaleString('id-ID')) + (st.diubahOleh ? ' oleh ' + esc(st.diubahOleh) : '') : '') + '</span></div>' +
          '<button type="button" class="btn ' + (on ? 'btn-danger' : 'btn-success') + '" id="akqToggle">' + (on ? 'Tutup Angket (OFF)' : 'Buka Angket (ON)') + '</button></div>';
        el('akqToggle').addEventListener('click', function () {
          if (on && !confirm('Tutup angket? Guru tidak bisa mengisi lagi sampai dibuka kembali. Jawaban yang sudah masuk tetap tersimpan.')) return;
          this.disabled = true;
          aturStatus(!on).then(function () {
            toast(on ? 'Angket ditutup.' : 'Angket dibuka untuk periode ' + labelPeriode(periodeSekarang()) + '.');
            renderStatus(); updateNotif(true); if (isiAngket) muatForm();
          }).catch(function (e) { toast('Gagal mengubah status: ' + (e && e.message ? e.message : e), true); renderStatus(); });
        });
      });
    }
    renderStatus();
    if (el('akqJenis')) el('akqJenis').addEventListener('change', muatForm);
    var sel = el('akqPeriode');
    if (sel) {
      var y = new Date().getFullYear(), opt = '';
      for (var t = y; t >= y - 2; t--) { opt += '<option value="' + t + '-2">Genap ' + t + '</option><option value="' + t + '-1">Ganjil ' + t + '</option>'; }
      sel.innerHTML = opt; sel.value = periodeSekarang(); sel.addEventListener('change', renderRekap);
    }
    Array.prototype.forEach.call(p.querySelectorAll('.akq-tab'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(p.querySelectorAll('.akq-tab'), function (x) { x.classList.toggle('on', x === b); });
        var rekap = b.getAttribute('data-tab') === 'rekap';
        el('akqTabIsi').classList.toggle('hidden', rekap);
        el('akqTabRekap').classList.toggle('hidden', !rekap);
        if (rekap) renderRekap();
      });
    });
    if (isiAngket) muatForm(); else { el('akqTabRekap').classList.remove('hidden'); renderRekap(); }
  }

  window.setupAngketKurikulumPage = setupPage;
  window.updateAngketKurikulumNotifDot = updateNotif;
  window.AngketKurikulum = { renderForm: renderForm, kirim: kirim, cekAktif: bacaStatus, butir: BUTIR, terbuka: TERBUKA, periodeSekarang: periodeSekarang };
})();
