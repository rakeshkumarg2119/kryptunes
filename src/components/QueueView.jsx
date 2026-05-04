import { useStore } from '../store/useStore';
import { formatTime } from '../utils/fileLoader';
import { Play, Trash2, X } from 'lucide-react';

export default function QueueView() {
  const { queue, currentTrack, queueIndex, playFromQueue, removeFromQueue, isPlaying } = useStore();

  return (
    <div style={styles.view}>
      <div style={styles.header}>
        <div style={styles.title}>Queue</div>
        <div style={styles.sub}>{queue.length} tracks</div>
      </div>

      {queue.length === 0 ? (
        <div style={styles.empty}>Queue is empty — add tracks to play next</div>
      ) : (
        <div style={styles.list}>
          {queue.map((track, i) => {
            const isActive = i === queueIndex;
            return (
              <div key={`${track.id}-${i}`} style={{
                ...styles.row,
                background: isActive ? 'rgba(108,99,255,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}>
                <div style={styles.rowLeft}>
                  <span style={styles.idx} className="mono">{(i + 1).toString().padStart(2, '0')}</span>
                  <div style={styles.meta}>
                    <div style={{
                      ...styles.trackTitle,
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)'
                    }}>
                      {track.title}
                      {isActive && isPlaying && <span style={styles.nowBadge}>NOW</span>}
                    </div>
                    <div style={styles.artist}>{track.artist}</div>
                  </div>
                </div>
                <div style={styles.rowRight}>
                  <span className="mono" style={styles.dur}>{formatTime(track.duration)}</span>
                  <button onClick={() => playFromQueue(i)} style={styles.iconBtn} title="Play">
                    <Play size={13} fill="currentColor" />
                  </button>
                  <button onClick={() => removeFromQueue(i)} style={{ ...styles.iconBtn, color: '#ff6584' }} title="Remove">
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  header: {
    padding: '28px 28px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(160deg, #161624 0%, var(--bg-surface) 100%)',
  },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  list: { padding: '8px 16px' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 12px 9px 10px', borderRadius: 8, marginBottom: 2,
    gap: 8, transition: 'background 0.1s',
  },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 },
  idx: { width: 22, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 },
  meta: { minWidth: 0 },
  trackTitle: {
    fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  nowBadge: {
    fontSize: 9, fontWeight: 800, letterSpacing: 1,
    background: 'var(--accent-primary)', color: '#fff',
    padding: '2px 5px', borderRadius: 4,
  },
  artist: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  dur: { fontSize: 11, color: 'var(--text-muted)', minWidth: 34 },
  iconBtn: {
    padding: 5, borderRadius: 5, background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  empty: {
    textAlign: 'center', padding: '60px 0',
    color: 'var(--text-muted)', fontSize: 13,
  },
};
