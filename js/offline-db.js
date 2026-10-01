/* ============================================================
   SI MAMBA - js/offline-db.js
   Lapisan IndexedDB untuk mendukung mode offline "sungguhan":

   1) OBJECT STORE "dataCache"
      Menyimpan salinan terakhir setiap dataset Firebase (siswa, absensi,
      nilai, jurnal, dst) di disk (bukan cuma memori tab), supaya kalau
      app dibuka tanpa internet, data terakhir yang berhasil disinkron
      tetap bisa ditampilkan (read-only) alih-alih halaman kosong/error.

   2) OBJECT STORE "pendingWrites"
      Antrian tulis (absensi siswa & jurnal mengajar) yang dibuat SAAT
      OFFLINE. Tersimpan permanen di disk sampai berhasil dikirim ke
      Firebase, jadi tidak hilang meskipun tab/app ditutup sebelum
      sempat online lagi.

   File ini dipakai di DUA konteks berbeda dengan cara yang sama
   (indexedDB tersedia baik di halaman maupun di Service Worker):
     - Halaman (index.html): <script src="js/offline-db.js"></script>
     - Service Worker (sw.js): importScripts('./js/offline-db.js')

   Diekspos sebagai objek global `SIMambaOfflineDB` dengan method
   berbasis Promise supaya gampang dipakai dari app.js maupun sw.js
   tanpa perlu library IndexedDB eksternal (idb, dll).
============================================================ */

(function (root) {
  const DB_NAME = 'si-mamba-offline';
  const DB_VERSION = 1;
  const STORE_CACHE = 'dataCache';       // keyPath: 'name'
  const STORE_QUEUE = 'pendingWrites';   // keyPath: 'id', autoIncrement

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
  }

  // ---------- dataCache: snapshot dataset Firebase ----------

  // Simpan satu dataset (mis. name='allJournals', data=[...]) ke cache.
  function setCache(name, data) {
    return tx(STORE_CACHE, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.put({ name, data, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  // Simpan banyak dataset sekaligus. entries = { allSiswa: [...], allJournals: [...], ... }
  function setCacheMany(entries) {
    return tx(STORE_CACHE, 'readwrite').then(store => new Promise((resolve, reject) => {
      const names = Object.keys(entries);
      if (names.length === 0) return resolve();
      let done = 0;
      let failed = null;
      names.forEach(name => {
        const req = store.put({ name, data: entries[name], updatedAt: new Date().toISOString() });
        req.onsuccess = () => { done++; if (done === names.length) failed ? reject(failed) : resolve(); };
        req.onerror = () => { failed = req.error; done++; if (done === names.length) reject(failed); };
      });
    }));
  }

  function getCache(name) {
    return tx(STORE_CACHE, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.get(name);
      req.onsuccess = () => resolve(req.result ? req.result.data : undefined);
      req.onerror = () => reject(req.error);
    }));
  }

  // Ambil semua dataset yang ada di cache sekaligus: { name: data, ... }
  function getCacheAll() {
    return tx(STORE_CACHE, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const out = {};
        (req.result || []).forEach(row => { out[row.name] = row.data; });
        resolve(out);
      };
      req.onerror = () => reject(req.error);
    }));
  }

  function getCacheUpdatedAt(name) {
    return tx(STORE_CACHE, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.get(name);
      req.onsuccess = () => resolve(req.result ? req.result.updatedAt : null);
      req.onerror = () => reject(req.error);
    }));
  }

  // ---------- pendingWrites: antrian absensi/jurnal saat offline ----------

  // payload bebas (object apapun); type = 'journal' | 'attendance' (bisa ditambah jenis lain nanti)
  function addPendingWrite(type, payload) {
    return tx(STORE_QUEUE, 'readwrite').then(store => new Promise((resolve, reject) => {
      const record = { type, payload, createdAt: new Date().toISOString(), attempts: 0 };
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result); // id yang baru dibuat
      req.onerror = () => reject(req.error);
    }));
  }

  function getAllPendingWrites() {
    return tx(STORE_QUEUE, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  }

  function countPendingWrites() {
    return tx(STORE_QUEUE, 'readonly').then(store => new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    }));
  }

  function deletePendingWrite(id) {
    return tx(STORE_QUEUE, 'readwrite').then(store => new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  // Catat percobaan sync yang gagal (untuk debugging & batas retry di masa depan)
  function bumpAttempt(id) {
    return tx(STORE_QUEUE, 'readwrite').then(store => new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const row = getReq.result;
        if (!row) return resolve();
        row.attempts = (row.attempts || 0) + 1;
        row.lastAttemptAt = new Date().toISOString();
        const putReq = store.put(row);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    }));
  }

  root.SIMambaOfflineDB = {
    setCache,
    setCacheMany,
    getCache,
    getCacheAll,
    getCacheUpdatedAt,
    addPendingWrite,
    getAllPendingWrites,
    countPendingWrites,
    deletePendingWrite,
    bumpAttempt,
  };
})(typeof self !== 'undefined' ? self : this);
