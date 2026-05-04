import { useState, memo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/fileLoader';
import { Play, Pause, Plus, MoreHorizontal, Trash2, ListPlus } from 'lucide-react';

const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9'];

// Memoized cover — only re-renders if track changes, lazy loads images
export const TrackCover = memo(function TrackCover({ track, size = 36, radius = 8 }) {
  const color = COLORS[track.title.charCodeAt(0) % COLORS.length];
  if (track.cover) {
    return (
      <img
        src={track.cover}
        alt=""
        loading="lazy"
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      border: `1px solid ${color}44`,
      background: `${color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: Math.floor(size * 0.33), color }}>♪</span>
    </div>
  );
});

// Inner row — stable props only, memoized so it never re-renders unless
// its own track becomes active/inactive or play state changes
const TrackRowInner = memo(function TrackRowInner({ track, index, queue, onDelete, isActive, isPlaying }) {
  const playTrack    = useStore(s => s.playTrack);
  const togglePlay   = useStore(s => s.togglePlay);
  const addToQueue   = useStore(s => s.addToQueue);
  const playlists    = useStore(s => s.playlists);
  const addToPlaylist = useStore(s => s.addToPlaylist);

  const [showMenu, setShowMenu] = useState(false);

  const handleRowClick = useCallback((e) => {
    if (e.target.closest('[data-no-click]')) return;
    if (isActive) togglePlay();
    else playTrack(track, queue);
  }, [isActive, track, queue, togglePlay, playTrack]);

  return (
    <div
      onClick={handleRowClick}
      style={{
        ...styles.row,
        background: isActive ? 'rgba(108,99,255,0.1)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
      }}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div style={styles.numWrap}>
        {isActive && isPlaying ? (
          <div style={styles.bars}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{ ...styles.bar, animationDelay: `${d}s` }} />
            ))}
          </div>
        ) : isActive ? (
          <Pause size={11} style={{ color: 'var(--accent-primary)' }} />
        ) : (
          <span style={styles.num}>{(index + 1).toString().padStart(2, '0')}</span>
        )}
      </div>

      <TrackCover track={track} size={34} radius={7} />

      <div style={styles.meta}>
        <div style={{
          ...styles.title,
          color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
          fontWeight: isActive ? 600 : 500,
        }}>
          {track.title}
        </div>
        <div style={styles.artist}>{track.artist}</div>
      </div>

      <div style={styles.right} data-no-click="true" onClick={e => e.stopPropagation()}>
        {track.source === 'gdrive' && <span style={styles.badge}>Drive</span>}
        <span className="mono" style={styles.dur}>{formatTime(track.duration)}</span>
        <div style={styles.actions}>
          <button
            onClick={() => isActive ? togglePlay() : playTrack(track, queue)}
            style={{ ...styles.actionBtn, color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            title={isActive && isPlaying ? 'Pause' : 'Play'}
          >
            {isActive && isPlaying
              ? <Pause size={13} fill="currentColor" />
              : <Play  size={13} fill="currentColor" />}
          </button>
          <button onClick={() => addToQueue(track)} style={styles.actionBtn} title="Add to queue">
            <Plus size={13} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={styles.actionBtn} title="More options">
              <MoreHorizontal size={13} />
            </button>
            {showMenu && (
              <div style={styles.menu}>
                <div style={styles.menuSection}>Add to playlist</div>
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => { addToPlaylist(pl.id, track); setShowMenu(false); }}
                    style={styles.menuItem}
                  >
                    <ListPlus size={12} /> {pl.name}
                  </button>
                ))}
                {playlists.length === 0 && <div style={styles.menuEmpty}>No playlists</div>}
                {onDelete && (
                  <>
                    <div style={styles.menuDivider} />
                    <button
                      onClick={() => { onDelete(track.id); setShowMenu(false); }}
                      style={{ ...styles.menuItem, color: '#ff6584' }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Public export — only reads currentTrack.id + isPlaying, nothing else.
// When track #5 plays, only the row for track #5 (and the previous active
// row) get isActive/isPlaying changed — all 995 other rows stay frozen.
export default function TrackRow({ track, index, queue, onDelete }) {
  const isActive  = useStore(s => s.currentTrack?.id === track.id);
  const isPlaying = useStore(s => s.isPlaying);

  return (
    <TrackRowInner
      track={track}
      index={index}
      queue={queue}
      onDelete={onDelete}
      isActive={isActive}
      isPlaying={isPlaying}
    />
  );
}

const styles = {
  row: {
    display: 'flex', alignItems: 'center',
    padding: '7px 10px 7px 8px',
    borderRadius: 8, marginBottom: 2,
    cursor: 'pointer', transition: 'background 0.1s',
    gap: 8,
  },
  numWrap: { width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' },
  bars: { display: 'flex', gap: 2, alignItems: 'flex-end', height: 13 },
  bar: {
    width: 3, height: '100%', borderRadius: 2,
    background: 'var(--accent-primary)',
    animation: 'barBounce 0.8s ease-in-out infinite',
    transformOrigin: 'bottom',
  },
  meta: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 13,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  artist: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  right: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  badge: {
    fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
    background: 'rgba(108,99,255,0.2)', color: 'var(--accent-primary)',
    padding: '2px 5px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.3)',
  },
  dur: { fontSize: 11, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' },
  actions: { display: 'flex', gap: 1 },
  actionBtn: {
    padding: 5, borderRadius: 5, border: 'none',
    background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.1s',
  },
  menu: {
    position: 'absolute', right: 0, top: '100%', zIndex: 200,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '6px', minWidth: 150,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.15s ease',
  },
  menuSection: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    color: 'var(--text-muted)', padding: '4px 8px 6px',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '6px 8px', borderRadius: 6,
    background: 'none', border: 'none', color: 'var(--text-primary)',
    cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
    transition: 'background 0.1s',
  },
  menuEmpty: { fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px 6px' },
  menuDivider: { height: 1, background: 'var(--border)', margin: '4px 0' },
};