import { saveFileHandle, saveAudioCache } from './db';

// ── Feature detection ────────────────────────────────────────────────────────
export const supportsFileSystemAccess = typeof window !== 'undefined' &&
  'showOpenFilePicker' in window;

// Max file size to cache in IndexedDB (50MB). Skip larger files.
const MAX_CACHE_BYTES = 50 * 1024 * 1024;

// ── Open files via File System Access API (Chrome/Edge desktop) ──────────────
export async function openFilesWithPicker() {
  const handles = await window.showOpenFilePicker({
    multiple: true,
    types: [{
      description: 'Audio Files',
      accept: {
        'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.mp4'],
      },
    }],
  });
  return processHandles(handles);
}

export async function openFolderWithPicker() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  const handles = [];
  await collectAudioHandles(dirHandle, handles);
  return processHandles(handles, dirHandle.name);
}

async function collectAudioHandles(dirHandle, out, rootName) {
  for await (const [, entry] of dirHandle.entries()) {
    if (entry.kind === 'file') {
      if (/\.(mp3|wav|ogg|flac|aac|m4a|opus|mp4)$/i.test(entry.name)) {
        entry._folderName = rootName || dirHandle.name;
        out.push(entry);
      }
    } else if (entry.kind === 'directory') {
      await collectAudioHandles(entry, out, rootName || dirHandle.name);
    }
  }
}

async function processHandles(handles, folderName) {
  const tracks = [];
  for (const handle of handles) {
    try {
      const file = await handle.getFile();
      const track = await parseFileMetadata(file, handle._folderName || folderName);
      await saveFileHandle(track.id, handle);
      // Also cache the audio blob so Android/Firefox fallback works if user opens on mobile
      if (file.size <= MAX_CACHE_BYTES) {
        saveAudioCache(track.id, file); // fire-and-forget, non-blocking
      }
      tracks.push(track);
    } catch (e) {
      console.warn('Could not read file handle:', e);
    }
  }
  return tracks;
}

// ── Restore file handles from IndexedDB after refresh ────────────────────────
export async function restoreHandles(handleMap) {
  const fileMap = {};
  const promises = Object.entries(handleMap).map(async ([trackId, handle]) => {
    try {
      let perm = await handle.queryPermission({ mode: 'read' });
      if (perm === 'prompt') {
        perm = await handle.requestPermission({ mode: 'read' });
      }
      if (perm !== 'granted') return;
      const file = await handle.getFile();
      fileMap[trackId] = file;
    } catch (_) {}
  });
  await Promise.allSettled(promises);
  return fileMap;
}

// ── Fallback: plain <input type="file"> (Android / Firefox / Safari) ─────────
// NOW saves audio blob to IndexedDB so tracks persist across refresh.
export async function loadLocalFiles(fileList) {
  const tracks = [];
  for (const file of Array.from(fileList)) {
    if (!isAudioFile(file)) continue;
    const folderName = file.webkitRelativePath
      ? file.webkitRelativePath.split('/')[0]
      : null;
    const track = await parseFileMetadata(file, folderName);

    // Cache audio in IndexedDB — this is what makes Android persist across refresh
    if (file.size <= MAX_CACHE_BYTES) {
      saveAudioCache(track.id, file); // fire-and-forget
    }

    tracks.push(track);
  }
  return tracks;
}

function isAudioFile(file) {
  const supported = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
    'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4',
  ];
  return supported.includes(file.type) ||
    /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(file.name);
}

// ── Pure-JS ID3v2 parser (no dependencies) ───────────────────────────────────

function readSynchsafe(b0, b1, b2, b3) {
  return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
}

function readUint32(b0, b1, b2, b3) {
  return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
}

function readString(data) {
  if (!data || !data.length) return '';
  const enc = data[0];
  const payload = data.slice(1);
  try {
    if (enc === 1 || enc === 2)
      return new TextDecoder('utf-16le').decode(payload).replace(/\0/g, '').trim();
    return new TextDecoder('utf-8').decode(payload).replace(/\0/g, '').trim();
  } catch { return ''; }
}

async function parseID3(file) {
  const result = { title: '', artist: '', album: '', cover: null };
  try {
    const buf = await file.slice(0, 524288).arrayBuffer();
    const bytes = new Uint8Array(buf);

    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return result;

    const ver = bytes[3];
    const id3Size = readSynchsafe(bytes[6], bytes[7], bytes[8], bytes[9]);
    let pos = 10;

    if (bytes[5] & 0x40) {
      const extSize = readUint32(bytes[10], bytes[11], bytes[12], bytes[13]);
      pos += extSize;
    }

    const end = Math.min(10 + id3Size, bytes.length);

    while (pos < end) {
      let frameId, frameSize, dataStart, headerLen;

      if (ver >= 3) {
        if (pos + 10 > end) break;
        frameId = String.fromCharCode(bytes[pos], bytes[pos+1], bytes[pos+2], bytes[pos+3]);
        frameSize = ver === 4
          ? readSynchsafe(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7])
          : readUint32(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
        headerLen = 10;
      } else {
        if (pos + 6 > end) break;
        frameId = String.fromCharCode(bytes[pos], bytes[pos+1], bytes[pos+2]);
        frameSize = (bytes[pos+3] << 16) | (bytes[pos+4] << 8) | bytes[pos+5];
        headerLen = 6;
      }

      dataStart = pos + headerLen;
      if (frameId === '\0\0\0\0' || frameId === '\0\0\0') break;
      if (frameSize <= 0 || dataStart + frameSize > bytes.length) break;

      const d = bytes.slice(dataStart, dataStart + frameSize);

      if (frameId === 'TIT2' || frameId === 'TT2') result.title  = readString(d);
      if (frameId === 'TPE1' || frameId === 'TP1') result.artist = readString(d);
      if (frameId === 'TALB' || frameId === 'TAL') result.album  = readString(d);

      if ((frameId === 'APIC' || frameId === 'PIC') && !result.cover) {
        let i = 1;
        if (ver >= 3) {
          while (i < d.length && d[i] !== 0) i++;
          i++;
        } else { i += 3; }
        i++;
        const enc = d[0];
        if (enc === 1 || enc === 2) {
          while (i + 1 < d.length && !(d[i] === 0 && d[i+1] === 0)) i += 2;
          i += 2;
        } else {
          while (i < d.length && d[i] !== 0) i++;
          i++;
        }
        const imgData = d.slice(i);
        if (imgData.length > 200) {
          let mime = 'image/jpeg';
          if (imgData[0] === 0x89 && imgData[1] === 0x50) mime = 'image/png';
          else if (imgData[0] === 0x47 && imgData[1] === 0x49) mime = 'image/gif';
          let binary = '';
          const chunk = 8192;
          for (let c = 0; c < imgData.length; c += chunk)
            binary += String.fromCharCode(...imgData.slice(c, c + chunk));
          result.cover = `data:${mime};base64,${btoa(binary)}`;
        }
      }

      pos = dataStart + frameSize;
    }
  } catch (_) {}
  return result;
}

// ── Main metadata parser ─────────────────────────────────────────────────────
async function parseFileMetadata(file, folderAlbum) {
  const id = `local-${file.name}-${file.size}`;
  const name = file.name.replace(/\.[^/.]+$/, '');

  const stripped = name.replace(/^\d+[\s.\-]+/, '').trim();
  const parts = stripped.split(' - ');
  const fileTitle  = parts.length > 1 ? parts.slice(1).join(' - ').trim() : stripped;
  const fileArtist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';

  const id3 = await parseID3(file);
  const album = id3.album || folderAlbum || 'Unknown Album';

  return {
    id,
    title:  id3.title  || fileTitle,
    artist: id3.artist || fileArtist,
    album,
    duration: 0,
    file,
    url: null,
    source: 'local',
    cover: id3.cover || null,
  };
}

export function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function generateId() {
  return Math.random().toString(36).slice(2);
}