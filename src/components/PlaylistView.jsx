import { useStore } from "../store/useStore";
import TrackRow from './TrackRow';
import { Play, Shuffle, ArrowLeft } from 'lucide-react';

export default function PlaylistView() {
  const { activePlaylist, playTrack, toggleShuffle, setActiveView, removeFromPlaylist } = useStore();

  if (!activePlaylist) return null;

  const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9'];
  const color = COLORS[activePlaylist.name.charCodeAt(0) % COLORS.length];

  const playAll = () => {
    if (activePlaylist.tracks.length > 0) {
      playTrack(activePlaylist.tracks[0], activePlaylist.tracks);
    }
  };

  const playShuffle = () => {
    if (activePlaylist.tracks.length > 0) {
      toggleShuffle();
      const idx = Math.floor(Math.random() * activePlaylist.tracks.length);
      playTrack(activePlaylist.tracks[idx], activePlaylist.tracks);
    }
  };

  return (
    <div style={styles.view}>
      <div style={{ ...styles.hero, background: `linear-gradient(160deg, ${color}22 0%, var(--bg-surface) 100%)` }}>
        <button onClick={() => setActiveView('home')} style={styles.back}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ ...styles.cover, background: `${color}22`, borderColor: `${color}44` }}>
          <span style={{ fontSize: 32, color }}>♫</span>
        </div>
        <div style={styles.info}>
          <div style={styles.type}>PLAYLIST</div>
          <div style={styles.name}>{activePlaylist.name}</div>
          <div style={styles.count}>{activePlaylist.tracks.length} tracks</div>
          <div style={styles.btns}>
            <button onClick={playAll} style={{ ...styles.playBtn, background: color }}>
              <Play size={16} fill="white" /> Play All
            </button>
            <button onClick={playShuffle} style={styles.shuffleBtn}>
              <Shuffle size={14} /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {activePlaylist.tracks.length === 0 ? (
        <div style={styles.empty}>
          Playlist empty — add tracks via the ••• menu on any track
        </div>
      ) : (
        <div style={styles.list}>
          {activePlaylist.tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              queue={activePlaylist.tracks}
              onDelete={(id) => removeFromPlaylist(activePlaylist.id, id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  hero: {
    padding: '20px 28px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  back: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
    alignSelf: 'flex-start', marginBottom: 8,
  },
  cover: {
    width: 100, height: 100, borderRadius: 16, border: '1px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  info: {},
  type: {
    fontSize: 10, fontWeight: 700, letterSpacing: 2,
    color: 'var(--text-muted)', marginBottom: 4,
  },
  name: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 },
  count: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 },
  btns: { display: 'flex', gap: 10 },
  playBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 22px', borderRadius: 10,
    border: 'none', color: '#fff', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
  },
  shuffleBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 10,
    background: 'none', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: 500, fontSize: 13, fontFamily: 'inherit',
  },
  list: { padding: '8px 16px' },
  empty: {
    textAlign: 'center', padding: '40px 0',
    color: 'var(--text-muted)', fontSize: 13,
  },
};
