// IndexedDB persistence
// FileSystemFileHandle objects CAN be stored in IndexedDB and survive refresh.
// On restore we call queryPermission/requestPermission — no full picker re-open needed.

const DB_NAME = 'KRYPTUNES-db';
const DB_VERSION = 2; // bumped to add fileHandles store
const STORES = {
  tracks: 'tracks',
  playlists: 'playlists',
  settings: 'settings',
  driveAccounts: 'driveAccounts',
  fileHandles: 'fileHandles',
};

let db = null;

export async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORES.tracks))
        d.createObjectStore(STORES.tracks, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(STORES.playlists))
        d.createObjectStore(STORES.playlists, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(STORES.settings))
        d.createObjectStore(STORES.settings, { keyPath: 'key' });
      if (!d.objectStoreNames.contains(STORES.driveAccounts))
        d.createObjectStore(STORES.driveAccounts, { keyPath: 'email' });
      if (!d.objectStoreNames.contains(STORES.fileHandles))
        d.createObjectStore(STORES.fileHandles, { keyPath: 'id' });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(storeName, 'readonly');
    const req = t.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Tracks ───────────────────────────────────────────────────────────────────
export async function saveTracks(tracks) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.tracks, 'readwrite');
    const store = t.objectStore(STORES.tracks);
    store.clear();
    tracks.forEach(track => store.put({ ...track, file: null }));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function loadTracks() { return getAll(STORES.tracks); }

// ── FileSystemFileHandle store ────────────────────────────────────────────────
export async function saveFileHandle(trackId, handle) {
  if (!handle) return;
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.fileHandles, 'readwrite');
    const req = t.objectStore(STORES.fileHandles).put({ id: trackId, handle });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllFileHandles() {
  const rows = await getAll(STORES.fileHandles);
  const map = {};
  rows.forEach(r => { map[r.id] = r.handle; });
  return map;
}

export async function deleteFileHandle(trackId) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.fileHandles, 'readwrite');
    t.objectStore(STORES.fileHandles).delete(trackId);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── Playlists ─────────────────────────────────────────────────────────────────
export async function savePlaylists(playlists) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.playlists, 'readwrite');
    const store = t.objectStore(STORES.playlists);
    store.clear();
    playlists.forEach(pl =>
      store.put({ ...pl, tracks: pl.tracks.map(t => ({ ...t, file: null })) })
    );
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function loadPlaylists() { return getAll(STORES.playlists); }

// ── Settings ──────────────────────────────────────────────────────────────────
export async function saveSetting(key, value) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.settings, 'readwrite');
    const req = t.objectStore(STORES.settings).put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadSetting(key) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.settings, 'readonly');
    const req = t.objectStore(STORES.settings).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── Session (last played track + progress) ────────────────────────────────────
// Saves { track, progress, queue, queueIndex, savedAt } so app can restore
// exactly where user left off — like Spotify. Expires after 7 days.
export async function saveSession(data) {
  return saveSetting('session', data);
}

export async function loadSession() {
  return loadSetting('session');
}

// ── Drive accounts ────────────────────────────────────────────────────────────
export async function saveDriveAccount(account) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.driveAccounts, 'readwrite');
    const req = t.objectStore(STORES.driveAccounts).put(account);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadDriveAccounts() { return getAll(STORES.driveAccounts); }

export async function removeDriveAccount(email) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORES.driveAccounts, 'readwrite');
    t.objectStore(STORES.driveAccounts).delete(email);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearAll() {
  const d = await openDB();
  const names = Object.values(STORES);
  return new Promise((resolve, reject) => {
    const t = d.transaction(names, 'readwrite');
    names.forEach(n => t.objectStore(n).clear());
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}