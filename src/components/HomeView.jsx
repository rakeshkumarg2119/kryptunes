import { useRef, useState, useMemo, memo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  openFilesWithPicker, openFolderWithPicker,
  loadLocalFiles, supportsFileSystemAccess,
} from '../utils/fileLoader';
import TrackRow from './TrackRow';
import { FolderOpen, FileAudio, Music2, ChevronDown, ChevronRight, Play, RefreshCw } from 'lucide-react';

const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9'];

const AlbumCover = memo(function AlbumCover({ tracks, size = 52 }) {
  const cover = tracks.find(t => t.cover)?.cover;
  const color = COLORS[(tracks[0]?.album || '').charCodeAt(0) % COLORS.length];
  if (cover) {
    return (
      <img
        src={cover}
        alt=""
        loading="lazy"
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}55, ${color}22)`,
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 22, color }}>♫</span>
    </div>
  );
});

const AlbumGroup = memo(function AlbumGroup({ album, tracks }) {
  const [open, setOpen] = useState(false);
  const playTrack = useStore(s => s.playTrack);
  const color = COLORS[album.charCodeAt(0) % COLORS.length];

  const playAll = useCallback((e) => {
    e.stopPropagation();
    if (tracks.length > 0) playTrack(tracks[0], tracks);
  }, [tracks, playTrack]);

  return (
    <div style={ag.wrap}>
      <div style={ag.header} onClick={() => setOpen(o => !o)}>
        <AlbumCover tracks={tracks} size={44} />
        <div style={ag.info}>
          <div style={ag.name}>{album}</div>
          <div style={ag.meta}>
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            {tracks[0]?.artist && tracks[0].artist !== 'Unknown Artist' && ` · ${tracks[0].artist}`}
          </div>
        </div>
        <button onClick={playAll} style={{ ...ag.playBtn, background: `${color}22`, color }} title="Play album">
          <Play size={13} fill="currentColor" />
        </button>
        <div style={ag.chevron}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      {open && (
        <div style={ag.tracks}>
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} queue={tracks} />
          ))}
        </div>
      )}
    </div>
  );
});

const ag = {
  wrap: { marginBottom: 6, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderRadius: 10 },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  playBtn: { width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chevron: { color: 'var(--text-muted)', flexShrink: 0 },
  tracks: { padding: '0 8px 8px' },
};

export default function HomeView() {
  const tracks         = useStore(s => s.tracks);
  const addTracks      = useStore(s => s.addTracks);
  const reattachFiles  = useStore(s => s.reattachFiles);
  const restoringFiles = useStore(s => s.restoringFiles);

  const fileRef         = useRef(null);
  const folderRef       = useRef(null);
  const mobileFilesRef  = useRef(null); // ← mobile multi-file picker
  const [loading, setLoading] = useState(false);

  const handleOpenFiles = async () => {
    if (supportsFileSystemAccess) {
      try {
        setLoading(true);
        const loaded = await openFilesWithPicker();
        const fileMap = {};
        loaded.forEach(t => { if (t.file) fileMap[t.id] = t.file; });
        reattachFiles(fileMap);
        addTracks(loaded);
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      fileRef.current?.click();
    }
  };

  const handleOpenFolder = async () => {
    if (supportsFileSystemAccess) {
      try {
        setLoading(true);
        const loaded = await openFolderWithPicker();
        const fileMap = {};
        loaded.forEach(t => { if (t.file) fileMap[t.id] = t.file; });
        reattachFiles(fileMap);
        addTracks(loaded);
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      folderRef.current?.click();
    }
  };

  // ── Mobile: tap to pick multiple audio files ──────────────────────────────
  const handleMobileFiles = () => {
    mobileFilesRef.current?.click();
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    const loaded = await loadLocalFiles(files);
    const fileMap = {};
    files.forEach(f => { fileMap[`local-${f.name}-${f.size}`] = f; });
    reattachFiles(fileMap);
    addTracks(loaded);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const loaded = await loadLocalFiles(files);
    const fileMap = {};
    files.forEach(f => { fileMap[`local-${f.name}-${f.size}`] = f; });
    reattachFiles(fileMap);
    addTracks(loaded);
  };

  const { albums, singles, localCount, driveCount, missingFiles } = useMemo(() => {
    const albumMap = {};
    let localCount = 0;
    let driveCount = 0;
    let missingFiles = 0;

    tracks.forEach(t => {
      const key = t.album || 'Unknown Album';
      if (!albumMap[key]) albumMap[key] = [];
      albumMap[key].push(t);
      if (t.source === 'local') {
        localCount++;
        if (!t.file) missingFiles++;
      }
      if (t.source === 'gdrive') driveCount++;
    });

    Object.values(albumMap).forEach(group => {
      group.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    });

    const albumEntries = Object.entries(albumMap).sort(([a], [b]) => a.localeCompare(b));
    const albums  = albumEntries.filter(([, ts]) => ts.length > 1);
    const singles = albumEntries.filter(([, ts]) => ts.length === 1).flatMap(([, ts]) => ts);

    return { albums, singles, localCount, driveCount, missingFiles };
  }, [tracks]);

  return (
    <div style={s.view} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>

      {/* ── Desktop hero bar ── */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={s.heroIcon}>
            <img src="/kryptunes.PNG" alt="K" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={s.heroTitle}>KRYPTUNES</div>
            <div style={s.heroSub}>Local files + Google Drive</div>
          </div>
        </div>
        <div style={s.btns}>
          <button onClick={handleOpenFolder} disabled={loading} style={s.btnPrimary}>
            <FolderOpen size={13} /> Open Folder
          </button>
          <button onClick={handleOpenFiles} disabled={loading} style={s.btnGhost}>
            <FileAudio size={13} /> Add Files
          </button>
        </div>

        {/* Hidden inputs — desktop fallback */}
        <input ref={fileRef} type="file" multiple accept="audio/*" onChange={handleFiles} style={{ display: 'none' }} />
        <input ref={folderRef} type="file" multiple accept="audio/*" webkitdirectory="" directory="" onChange={handleFiles} style={{ display: 'none' }} />

        {/* Hidden input — mobile multi-file picker (no folder, just files) */}
        <input ref={mobileFilesRef} type="file" multiple accept="audio/*" onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {/* ── Mobile add-files banner — only shown on small screens ── */}
      <div className="mobile-add-bar" style={s.mobileAddBar}>
        <button onClick={handleMobileFiles} disabled={loading} style={s.mobileAddBtn}>
          <FileAudio size={14} />
          {loading ? 'Loading…' : 'Add Music Files'}
        </button>
        <span style={s.mobileAddHint}>Select multiple · MP3 WAV FLAC OGG</span>
      </div>

      {restoringFiles && missingFiles > 0 && (
        <div style={s.restoreBanner}>
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
          Restoring {missingFiles} local track{missingFiles !== 1 ? 's' : ''}…
        </div>
      )}

      {!restoringFiles && missingFiles > 0 && localCount > 0 && (
        <div style={s.permBanner}>
          <span>⚠</span>
          <span>
            {missingFiles} track{missingFiles !== 1 ? 's' : ''} need{missingFiles === 1 ? 's' : ''} file access.{' '}
            <button onClick={handleOpenFolder} style={s.inlineLinkBtn}>Re-open folder</button> or{' '}
            <button onClick={handleMobileFiles} style={s.inlineLinkBtn}>Add files</button> to restore playback.
          </span>
        </div>
      )}

      {tracks.length > 0 && (
        <div style={s.stats}>
          <div style={s.stat}><span style={s.statN}>{tracks.length}</span><span style={s.statL}>tracks</span></div>
          <div style={s.statDiv} />
          <div style={s.stat}><span style={s.statN}>{albums.length}</span><span style={s.statL}>albums</span></div>
          {localCount > 0 && <><div style={s.statDiv} /><div style={s.stat}><span style={s.statN}>{localCount}</span><span style={s.statL}>local</span></div></>}
          {driveCount > 0 && <><div style={s.statDiv} /><div style={s.stat}><span style={s.statN}>{driveCount}</span><span style={s.statL}>drive</span></div></>}
          <div style={{ marginLeft: 'auto' }}>
            <span style={s.dropHint}>drag & drop · Drive → Settings</span>
          </div>
        </div>
      )}

      {albums.length > 0 && (
        <div style={s.section}>
          <div style={s.sHead}>Albums</div>
          {albums.map(([album, ts]) => (
            <AlbumGroup key={album} album={album} tracks={ts} />
          ))}
        </div>
      )}

      {singles.length > 0 && (
        <div style={s.section}>
          <div style={s.sHead}>Tracks</div>
          {singles.map((t, i) => <TrackRow key={t.id} track={t} index={i} queue={singles} />)}
        </div>
      )}

      {tracks.length === 0 && (
        <div style={s.empty}>
          <div style={s.emptyIcon}>♫</div>
          <div>Drop music here or open a folder</div>
          <div style={s.emptyMono}>MP3 · WAV · OGG · FLAC · AAC · M4A</div>
          <div style={s.emptyMono}>Files remembered after refresh — no re-picking needed</div>
          <div style={s.emptyMono}>Google Drive → Settings</div>
        </div>
      )}
    </div>
  );
}

const s = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  hero: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10, padding: '11px 20px',
    background: 'linear-gradient(90deg, #13122099 0%, var(--bg-surface) 100%)',
    borderBottom: '1px solid var(--border)',
  },
  heroLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  heroIcon: {
    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: {
    fontWeight: 800, fontSize: 13, letterSpacing: 2,
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  heroSub: { fontSize: 10, color: 'var(--text-muted)', marginTop: 1 },
  btns: { display: 'flex', gap: 6 },
  btnPrimary: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
    background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 12, boxShadow: '0 2px 12px var(--accent-glow)', fontFamily: 'inherit',
  },
  btnGhost: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
    background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)',
    cursor: 'pointer', fontWeight: 500, fontSize: 12, fontFamily: 'inherit',
  },

  // ── Mobile add bar — hidden on desktop via globals.css ──
  mobileAddBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px',
    background: 'rgba(108,99,255,0.07)',
    borderBottom: '1px solid var(--border)',
  },
  mobileAddBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 9,
    background: 'var(--accent-primary)', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
    flexShrink: 0,
    boxShadow: '0 2px 12px var(--accent-glow)',
  },
  mobileAddHint: {
    fontSize: 10, color: 'var(--text-muted)',
    fontFamily: 'DM Mono, monospace',
  },

  restoreBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 20px', fontSize: 12, color: 'var(--text-muted)',
    background: 'rgba(108,99,255,0.07)', borderBottom: '1px solid var(--border)',
  },
  permBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 20px', fontSize: 12,
    background: 'rgba(247,151,30,0.08)', borderBottom: '1px solid rgba(247,151,30,0.2)',
    color: '#f7971e',
  },
  inlineLinkBtn: {
    background: 'none', border: 'none', color: 'var(--accent-primary)',
    cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0,
    textDecoration: 'underline', fontFamily: 'inherit',
  },
  stats: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '9px 20px',
    borderBottom: '1px solid var(--border)',
  },
  stat: { display: 'flex', alignItems: 'baseline', gap: 4 },
  statDiv: { width: 1, height: 14, background: 'var(--border)' },
  statN: { fontSize: 17, fontWeight: 800, color: 'var(--accent-primary)' },
  statL: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 },
  dropHint: { fontSize: 10, color: 'var(--text-muted)' },
  section: { padding: '12px 14px' },
  sHead: { fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 24px', color: 'var(--text-muted)' },
  emptyIcon: { fontSize: 40, opacity: 0.15, marginBottom: 6 },
  emptyMono: { fontFamily: 'DM Mono, monospace', fontSize: 10, marginTop: 2 },
};