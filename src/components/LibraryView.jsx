import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import TrackRow from './TrackRow';

export default function LibraryView() {
  // Subscribe only to what this view needs — not the whole store
  const tracks    = useStore(s => s.tracks);
  const setTracks = useStore(s => s.setTracks);

  const [sort, setSort] = useState('title');

  // useMemo: sort only recomputes when tracks or sort key changes,
  // not on every play/pause/progress update
  const sorted = useMemo(() => {
    const arr = [...tracks];
    if (sort === 'title')  arr.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'artist') arr.sort((a, b) => a.artist.localeCompare(b.artist));
    if (sort === 'source') arr.sort((a, b) => a.source.localeCompare(b.source));
    return arr;
  }, [tracks, sort]);

  const removeTrack = useCallback((id) => {
    setTracks(tracks.filter(t => t.id !== id));
  }, [tracks, setTracks]);

  const sorts = ['title', 'artist', 'source'];

  return (
    <div style={styles.view}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Library</div>
          <div style={styles.sub}>{tracks.length} tracks</div>
        </div>
        <div style={styles.sortRow}>
          {sorts.map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                ...styles.sortBtn,
                ...(sort === s ? styles.sortActive : {}),
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tableHead}>
        <span style={styles.thNum}>#</span>
        <span>Title</span>
        <span style={styles.thRight}>Duration</span>
      </div>

      {sorted.length === 0 ? (
        <div style={styles.empty}>Library empty — add tracks from Home</div>
      ) : (
        <div style={styles.list}>
          {sorted.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              queue={sorted}
              onDelete={removeTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  header: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '28px 28px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(160deg, #161624 0%, var(--bg-surface) 100%)',
  },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  sortRow: { display: 'flex', gap: 4 },
  sortBtn: {
    padding: '5px 12px', borderRadius: 6,
    background: 'none', border: '1px solid var(--border)',
    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
    fontFamily: 'inherit',
  },
  sortActive: {
    background: 'var(--accent-primary)', color: '#fff',
    borderColor: 'var(--accent-primary)',
  },
  tableHead: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 24px',
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
  },
  thNum: { width: 34, flexShrink: 0 },
  thRight: { marginLeft: 'auto' },
  list: { padding: '8px 16px' },
  empty: {
    textAlign: 'center', padding: '60px 0',
    color: 'var(--text-muted)', fontSize: 13,
  },
};