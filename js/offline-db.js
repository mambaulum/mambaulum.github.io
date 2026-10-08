/* ============================================================
   SI MAMBA - js/offline-db.js (revisi)
   Lapisan IndexedDB untuk mode offline.

   Perubahan dari versi sebelumnya:
   - Promise di-resolve di tx.oncomplete (data benar-benar ter-commit
     ke disk), bukan di req.onsuccess.
   - dbPromise di-reset jika open gagal, sehingga bisa dicoba lagi.
   - onversionchange menutup koneksi lama; onblocked memberi peringatan.
   - Antrean punya batas MAX_ATTEMPTS. Item yang melewati batas
     dipindahkan ke store "deadLetter" dan tidak diproses ulang.

   Object store:
   - "dataCache"     (keyPath: 'name')  salinan dataset Firebase terakhir
   - "pendingWrites" (keyPath: 'id', autoIncrement) antrean tulis offline
   - "deadLetter"    (keyPath: 'id', autoIncrement) antrean gagal permanen

   Dipakai di halaman (index.html) dan Service Worker (importScripts).
   Diekspos sebagai global `SIMambaOfflineDB` dengan API berbasis Promise.
============================================================ */

(function (root) {
  const DB_NAME = 'si-mamba-offline';
  const DB_VERSION = 2;
  const STORE_CACHE = 'dataCache';
  const STORE_QUEUE = 'pendingWrites';
  const STORE_DEAD = 'deadLetter';
  const MAX_ATTEMPTS = 5;

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB tidak tersedia'));
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_DEAD)) {
          db.createObjectStore(STORE_DEAD, { keyPath: 'id', autoIncrement: true });
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        // Tab lain ingin upgrade versi: lepaskan koneksi ini supaya tidak memblokir.
        db.onversionchange = () => db.close();
        resolve(db);
      };

      req.onblocked = () => {
        console.warn('[SIMambaOfflineDB] Upgrade database diblokir oleh tab lain. Tutup tab lain lalu muat ulang.');
      };

      req.onerror = () => {
        // Reset supaya pemanggilan berikutnya bisa mencoba open lagi.
        dbPromise = null;
        reject(req.error);
      };
    });
    return dbPromise;
  }

  /*
    runTx: satu transaksi, satu fungsi. Promise resolve hanya setelah
    tx.oncomplete (commit ke disk). fn(store, setResult) menjalankan
    request-request di dalam transaksi dan boleh memanggil setResult(v).
  */
  function runTx(storeNames, mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
      let t;
      try {
        t = db.transaction(storeNames, mode);
      } catch (err) {
        return reject(err);
      }
      let result;
      const setResult = (v) => { result = v; };
      try {
        const stores = Array.isArray(storeNames)
          ? storeNames.map(n => t.objectStore(n))
          : t.objectStore(storeNames);
        fn(stores, setResult, t);
      } catch (err) {
        try { t.abort(); } catch (_) {}
        return reject(err);
      }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Transaksi dibatalkan'));
    }));
  }

  function reqToPromise(req) {
    return req; // dipakai di dalam runTx, hasil diambil lewat setResult
  }

  // ---------- dataCache: snapshot dataset Firebase ----------

  function setCache(name, data) {
    return runTx(STORE_CACHE, 'readwrite', (store) => {
      store.put({ name, data, updatedAt: new Date().toISOString() });
    });
  }

  // entries = { allSiswa: [...], allJournals: [...], ... }
  function setCacheMany(entries) {
    const names = Object.keys(entries);
    if (names.length === 0) return Promise.resolve();
    return runTx(STORE_CACHE, 'readwrite', (store) => {
      const now = new Date().toISOString();
      names.forEach(name => {
        store.put({ name, data: entries[name], updatedAt: now });
      });
    });
  }

  function getCache(name) {
    return runTx(STORE_CACHE, 'readonly', (store, setResult) => {
      const req = store.get(name);
      req.onsuccess = () => setResult(req.result ? req.result.data : undefined);
    });
  }

  function getCacheAll() {
    return runTx(STORE_CACHE, 'readonly', (store, setResult) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const out = {};
        (req.result || []).forEach(row => { out[row.name] = row.data; });
        setResult(out);
      };
    });
  }

  function getCacheUpdatedAt(name) {
    return runTx(STORE_CACHE, 'readonly', (store, setResult) => {
      const req = store.get(name);
      req.onsuccess = () => setResult(req.result ? req.result.updatedAt : null);
    });
  }

  // ---------- pendingWrites: antrean absensi/jurnal saat offline ----------

  function addPendingWrite(type, payload) {
    return runTx(STORE_QUEUE, 'readwrite', (store, setResult) => {
      const record = { type, payload, createdAt: new Date().toISOString(), attempts: 0 };
      const req = store.add(record);
      req.onsuccess = () => setResult(req.result); // id baru
    });
  }

  function getAllPendingWrites() {
    return runTx(STORE_QUEUE, 'readonly', (store, setResult) => {
      const req = store.getAll();
      req.onsuccess = () => setResult(req.result || []);
    });
  }

  function countPendingWrites() {
    return runTx(STORE_QUEUE, 'readonly', (store, setResult) => {
      const req = store.count();
      req.onsuccess = () => setResult(req.result || 0);
    });
  }

  function deletePendingWrite(id) {
    return runTx(STORE_QUEUE, 'readwrite', (store) => {
      store.delete(id);
    });
  }

  /*
    bumpAttempt: catat percobaan gagal. Jika attempts >= MAX_ATTEMPTS,
    item dipindah ke deadLetter dalam transaksi yang sama (atomik).
    Mengembalikan 'retry' | 'dead' | 'missing'.
  */
  function bumpAttempt(id, errorMessage) {
    return runTx([STORE_QUEUE, STORE_DEAD], 'readwrite', ([queue, dead], setResult) => {
      const getReq = queue.get(id);
      getReq.onsuccess = () => {
        const row = getReq.result;
        if (!row) return setResult('missing');
        row.attempts = (row.attempts || 0) + 1;
        row.lastAttemptAt = new Date().toISOString();
        if (errorMessage) row.lastError = String(errorMessage).slice(0, 500);

        if (row.attempts >= MAX_ATTEMPTS) {
          queue.delete(id);
          const { id: _omit, ...rest } = row;
          dead.add({ ...rest, movedAt: new Date().toISOString() });
          setResult('dead');
        } else {
          queue.put(row);
          setResult('retry');
        }
      };
    });
  }

  function getDeadLetters() {
    return runTx(STORE_DEAD, 'readonly', (store, setResult) => {
      const req = store.getAll();
      req.onsuccess = () => setResult(req.result || []);
    });
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
    getDeadLetters,
    MAX_ATTEMPTS,
  };
})(typeof self !== 'undefined' ? self : this);
