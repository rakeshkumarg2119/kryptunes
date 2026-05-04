import { create } from 'zustand';
import * as DB from '../utils/db';
import { invalidateLoadedTrack } from '../hooks/useAudioEngine';
import { restoreHandles } from '../utils/fileLoader';

let _saveTimer = null;
function debouncedSaveTracks(tracks) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => DB.saveTracks(tracks), 600);
}

// Saves session 5s after last progress tick
let _sessionTimer = null;
function debouncedSaveSession(data) {
  clearTimeout(_sessionTimer);
  _sessionTimer = setTimeout(() => DB.saveSession(data), 5000);
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const useStore = create((set, get) => ({
  tracks: [],
  playlists: [],
  activePlaylist: null,
  dbReady: false,

  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',
  audioRef: null,

  // ── Holds the restored seek position until audio engine consumes it ──
  restoredProgress: null,

  activeView: 'home',
  sidebarOpen: true,
  restoringFiles: false,

  eqBands: [
    { freq: 60,    gain: 0, label: '60Hz'  },
    { freq: 170,   gain: 0, label: '170Hz' },
    { freq: 310,   gain: 0, label: '310Hz' },
    { freq: 600,   gain: 0, label: '600Hz' },
    { freq: 1000,  gain: 0, label: '1kHz'  },
    { freq: 3000,  gain: 0, label: '3kHz'  },
    { freq: 6000,  gain: 0, label: '6kHz'  },
    { freq: 12000, gain: 0, label: '12kHz' },
    { freq: 14000, gain: 0, label: '14kHz' },
    { freq: 16000, gain: 0, label: '16kHz' },
  ],
  eqEnabled: true,

  driveAccounts: [],
  activeDriveEmail: null,

  initDB: async () => {
    try {
      const [tracks, playlists, vol, eq, eqOn, driveAccounts, session] = await Promise.all([
        DB.loadTracks(),
        DB.loadPlaylists(),
        DB.loadSetting('volume'),
        DB.loadSetting('eqBands'),
        DB.loadSetting('eqEnabled'),
        DB.loadDriveAccounts(),
        DB.loadSession(),
      ]);

      const cleanTracks = (tracks || []).map(t => {
        if (t.cover && t.cover.startsWith('blob:')) return { ...t, cover: null };
        return t;
      });

      // ── Restore last session if within 7 days ──
      let restoredTrack    = null;
      let restoredQueue    = [];
      let restoredIndex    = 0;
      let restoredProgress = null;

      if (session?.track && session?.savedAt && (Date.now() - session.savedAt) < SEVEN_DAYS) {
        restoredTrack    = session.track;
        restoredQueue    = session.queue || [session.track];
        restoredIndex    = session.queueIndex || 0;
        restoredProgress = session.progress || null;
      }

      set({
        tracks: cleanTracks,
        playlists: playlists || [],
        volume: vol ?? 0.8,
        eqBands: eq ?? get().eqBands,
        eqEnabled: eqOn ?? true,
        driveAccounts: driveAccounts || [],
        dbReady: true,
        currentTrack: restoredTrack,
        queue: restoredQueue,
        queueIndex: restoredIndex,
        progress: restoredProgress ?? 0,
        restoredProgress,          // engine reads this in onLoadedMetadata
        isPlaying: false,
        restoringFiles: cleanTracks.some(t => t.source === 'local'),
      });

      if (cleanTracks.some(t => t.source === 'local')) {
        const handleMap = await DB.loadAllFileHandles();
        if (Object.keys(handleMap).length > 0) {
          const fileMap = await restoreHandles(handleMap);
          if (Object.keys(fileMap).length > 0) {
            get().reattachFiles(fileMap);
          }
        }
        set({ restoringFiles: false });
      }

    } catch (err) {
      console.error('DB init failed:', err);
      set({ dbReady: true, restoringFiles: false });
    }
  },

  // Called by audio engine after it seeks — clears the one-shot position
  clearRestoredProgress: () => set({ restoredProgress: null }),

  addTracks: (newTracks) => {
    set((s) => {
      const existingIds = new Set(s.tracks.map(t => t.id));
      const fresh = newTracks.filter(t => !existingIds.has(t.id));
      if (!fresh.length) return s;
      const merged = [...s.tracks, ...fresh];
      debouncedSaveTracks(merged);
      return { tracks: merged };
    });
  },

  setTracks: (tracks) => {
    debouncedSaveTracks(tracks);
    set({ tracks });
  },

  reattachFiles: (fileMap) => {
    set((s) => {
      const updatedTracks = s.tracks.map(t => {
        const file = fileMap[t.id];
        if (!file) return t;
        return { ...t, file };
      });
      const updatedCurrent = s.currentTrack
        ? (updatedTracks.find(t => t.id === s.currentTrack.id) || s.currentTrack)
        : null;
      return { tracks: updatedTracks, currentTrack: updatedCurrent };
    });
    invalidateLoadedTrack();
  },

  playTrack: (track, queueList) => {
    const state = get();
    const queue = queueList || state.tracks;
    const idx = queue.findIndex(t => t.id === track.id);
    const liveTrack = state.tracks.find(t => t.id === track.id) || track;
    const liveQueue = queue.map(t => state.tracks.find(s => s.id === t.id) || t);
    // Clear restored position when user manually picks a track
    set({ currentTrack: liveTrack, queue: liveQueue, queueIndex: idx >= 0 ? idx : 0, isPlaying: true, restoredProgress: null });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (v) => set({ isPlaying: v }),

  setVolume: (v) => { DB.saveSetting('volume', v); set({ volume: v }); },

  // Saves session every 5s while playing
  setProgress: (v) => {
    set({ progress: v });
    const { currentTrack, queue, queueIndex, isPlaying } = get();
    if (currentTrack && isPlaying && v > 0) {
      debouncedSaveSession({
        track: { ...currentTrack, file: null },
        progress: v,
        queue: queue.map(t => ({ ...t, file: null })),
        queueIndex,
        savedAt: Date.now(),
      });
    }
  },

  setDuration: (v) => set({ duration: v }),
  setAudioRef: (ref) => set({ audioRef: ref }),

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (!queue.length) return;
    let idx;
    if (shuffle) idx = Math.floor(Math.random() * queue.length);
    else if (repeat === 'all') idx = (queueIndex + 1) % queue.length;
    else idx = Math.min(queueIndex + 1, queue.length - 1);
    set({ currentTrack: queue[idx], queueIndex: idx, isPlaying: true, restoredProgress: null });
  },

  prevTrack: () => {
    const { queue, queueIndex, progress, audioRef } = get();
    if (!queue.length) return;
    if (progress > 3) { if (audioRef?.current) audioRef.current.currentTime = 0; return; }
    const idx = Math.max(queueIndex - 1, 0);
    set({ currentTrack: queue[idx], queueIndex: idx, isPlaying: true, restoredProgress: null });
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set((s) => ({
    repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none',
  })),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  removeFromQueue: (idx) => set((s) => ({ queue: s.queue.filter((_, i) => i !== idx) })),
  playFromQueue: (idx) => set((s) => ({ currentTrack: s.queue[idx], queueIndex: idx, isPlaying: true, restoredProgress: null })),

  createPlaylist: (name) => {
    set((s) => {
      const playlists = [...s.playlists, { id: Date.now().toString(), name, tracks: [] }];
      DB.savePlaylists(playlists);
      return { playlists };
    });
  },

  addToPlaylist: (playlistId, track) => {
    set((s) => {
      const playlists = s.playlists.map(p =>
        p.id === playlistId && !p.tracks.find(t => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, { ...track, file: null }] } : p
      );
      DB.savePlaylists(playlists);
      return { playlists };
    });
  },

  removeFromPlaylist: (playlistId, trackId) => {
    set((s) => {
      const playlists = s.playlists.map(p =>
        p.id === playlistId ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) } : p
      );
      DB.savePlaylists(playlists);
      return { playlists };
    });
  },

  deletePlaylist: (id) => {
    set((s) => {
      const playlists = s.playlists.filter(p => p.id !== id);
      DB.savePlaylists(playlists);
      return { playlists };
    });
  },

  setActivePlaylist: (pl) => set({ activePlaylist: pl, activeView: 'playlist' }),

  setEqBand: (index, gain) => {
    set((s) => {
      const eqBands = s.eqBands.map((b, i) => i === index ? { ...b, gain } : b);
      DB.saveSetting('eqBands', eqBands);
      return { eqBands };
    });
  },

  toggleEq: () => {
    set((s) => { DB.saveSetting('eqEnabled', !s.eqEnabled); return { eqEnabled: !s.eqEnabled }; });
  },

  setActiveView: (v) => set({ activeView: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addDriveAccount: (account) => {
    set((s) => {
      const exists = s.driveAccounts.find(a => a.email === account.email);
      const driveAccounts = exists
        ? s.driveAccounts.map(a => a.email === account.email ? account : a)
        : [...s.driveAccounts, account];
      DB.saveDriveAccount(account);
      return { driveAccounts, activeDriveEmail: account.email };
    });
  },

  removeDriveAccount: (email) => {
    set((s) => {
      const driveAccounts = s.driveAccounts.filter(a => a.email !== email);
      const tracks = s.tracks.filter(t => !(t.source === 'gdrive' && t.driveEmail === email));
      DB.removeDriveAccount(email);
      debouncedSaveTracks(tracks);
      return {
        driveAccounts, tracks,
        activeDriveEmail: s.activeDriveEmail === email ? (driveAccounts[0]?.email || null) : s.activeDriveEmail,
      };
    });
  },

  setActiveDriveAccount: (email) => set({ activeDriveEmail: email }),
}));