// IndexedDB persistence
// FileSystemFileHandle stored for Chrome/Edge (desktop).
// Audio blob cache stored for Android/Firefox (no File System Access API).

const DB_NAME = 'KRYPTUNES-db';
const DB_VERSION = 3; // bumped: add audioCache store
const STORES = {
  tracks: 'tracks',
  playlists: 'playlists',
  settings: 'settings',
  driveAccounts: 'driveAccounts',
  fileHandles: 'fileHandles',
  audioCache: 'audioCache',   // NEW: stores raw audio ArrayBuffers
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
      if (!d.objectStoreNames.contains(STORES.audioCache))
        d.createObjectStore(STORES.audioCache, { keyPath: 'id' });
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

// ── Tracks ────────────────────────────────────────────────────────────────
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

// ── Audio blob cache (Android / no File System Access API) ────────────────
// Stores the raw ArrayBuffer of the audio file so it survives page refresh.
// Max ~50MB per entry — browser will evict under storage pressure (fine).

export async function saveAudioCache(trackId, file) {
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORES.audioCache, 'readwrite');
      const req = t.objectStore(STORES.audioCache).put({
        id: trackId,
        buffer,
        type: file.type || 'audio/mpeg',
        name: file.name,
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Storage quota exceeded or other error — fail silently
    console.warn('saveAudioCache failed:', e);
  }
}

export async function loadAudioCache(trackId) {
  try {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORES.audioCache, 'readonly');
      const req = t.objectStore(STORES.audioCache).get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function loadAllAudioCacheIds() {
  try {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORES.audioCache, 'readonly');
      const req = t.objectStore(STORES.audioCache).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteAudioCache(trackId) {
  try {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORES.audioCache, 'readwrite');
      t.objectStore(STORES.audioCache).delete(trackId);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch { /* ignore */ }
}

// ── FileSystemFileHandle store (Chrome/Edge desktop) ─────────────────────
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

// ── Playlists ─────────────────────────────────────────────────────────────
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

// ── Settings ──────────────────────────────────────────────────────────────
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

// ── Session ───────────────────────────────────────────────────────────────
export async function saveSession(data) { return saveSetting('session', data); }
export async function loadSession()     { return loadSetting('session'); }

// ── Drive accounts ────────────────────────────────────────────────────────
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