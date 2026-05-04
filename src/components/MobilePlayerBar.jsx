import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/fileLoader';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, ChevronDown, ListMusic,
} from 'lucide-react';

const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9'];

// ── Touch-friendly seek bar ────────────────────────────────────────────────
function MobileSeekBar({ progress, duration, compact }) {
  const { audioRef } = useStore();
  const barRef = useRef(null);
  const touching = useRef(false);
  const [localPct, setLocalPct] = useState(null);

  const pct = localPct !== null
    ? localPct
    : (duration > 0 ? Math.min(100, (progress / duration) * 100) : 0);

  const getPct = useCallback((clientX) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onTouchStart = useCallback((e) => {
    touching.current = true;
    setLocalPct(getPct(e.touches[0].clientX) * 100);
  }, [getPct]);

  const onTouchMove = useCallback((e) => {
    if (!touching.current) return;
    e.preventDefault();
    setLocalPct(getPct(e.touches[0].clientX) * 100);
  }, [getPct]);

  const onTouchEnd = useCallback((e) => {
    if (!touching.current) return;
    touching.current = false;
    const p = getPct(e.changedTouches[0].clientX);
    setLocalPct(null);
    const audio = audioRef?.current;
    if (audio && duration) audio.currentTime = p * duration;
  }, [audioRef, duration, getPct]);

  return (
    <div
      ref={barRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative',
        height: compact ? 2 : 4,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        width: '100%',
        flexShrink: 0,
        touchAction: 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${pct}%`,
        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
        borderRadius: 4,
      }} />
      {!compact && (
        <div style={{
          position: 'absolute', top: '50%',
          left: `clamp(0px, calc(${pct}% - 8px), calc(100% - 16px))`,
          transform: 'translateY(-50%)',
          width: 16, height: 16,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 0 8px rgba(108,99,255,0.9)',
        }} />
      )}
    </div>
  );
}

// ── Cover thumbnail ────────────────────────────────────────────────────────
function MiniCover({ track, size }) {
  if (!track) {
    return (
      <img src="/kryptunes.PNG" alt="K"
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  const color = COLORS[track.title.charCodeAt(0) % COLORS.length];
  if (track.cover) {
    return (
      <img src={track.cover} alt=""
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}55, ${color}22)`,
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, color }}>♪</span>
    </div>
  );
}

// ── Full-screen expanded player sheet ─────────────────────────────────────
function ExpandedSheet({ analyserRef, onCollapse }) {
  const {
    currentTrack, isPlaying, progress, duration,
    shuffle, repeat, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, setActiveView,
  } = useStore();

  const color = currentTrack
    ? COLORS[currentTrack.title.charCodeAt(0) % COLORS.length]
    : '#6c63ff';

  return (
    <div style={ex.sheet}>
      {/* Drag handle pill */}
      <div style={ex.pill} />

      {/* Top row */}
      <div style={ex.topRow}>
        <button onClick={onCollapse} style={ex.collapseBtn}>
          <ChevronDown size={22} />
        </button>
        <span style={ex.nowPlaying}>NOW PLAYING</span>
        <button
          onClick={() => { setActiveView('queue'); onCollapse(); }}
          style={ex.queueBtn}
        >
          <ListMusic size={20} />
        </button>
      </div>

      {/* Big cover */}
      <div style={ex.coverWrap}>
        <MiniCover track={currentTrack} size={220} />
        {/* Glow halo */}
        <div style={{
          ...ex.glow,
          background: `radial-gradient(ellipse at center, ${color}33 0%, transparent 70%)`,
        }} />
      </div>

      {/* Track info */}
      <div style={ex.info}>
        {currentTrack ? (
          <>
            <div style={ex.title}>{currentTrack.title}</div>
            <div style={ex.artist}>{currentTrack.artist}</div>
          </>
        ) : (
          <div style={ex.artist}>No track loaded</div>
        )}
      </div>

      {/* Seek */}
      <div style={ex.seekWrap}>
        <MobileSeekBar progress={progress} duration={duration} compact={false} />
        <div style={ex.timeRow}>
          <span className="mono" style={ex.time}>{formatTime(progress)}</span>
          <span className="mono" style={ex.time}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={ex.controls}>
        <button onClick={toggleShuffle}
          style={{ ...ex.iconBtn, color: shuffle ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
          <Shuffle size={18} />
        </button>

        <button onClick={prevTrack} style={ex.iconBtn}>
          <SkipBack size={28} fill="currentColor" />
        </button>

        <button onClick={togglePlay} style={{ ...ex.playBtn, background: color }}>
          {isPlaying
            ? <Pause size={26} fill="currentColor" />
            : <Play  size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
        </button>

        <button onClick={nextTrack} style={ex.iconBtn}>
          <SkipForward size={28} fill="currentColor" />
        </button>

        <button onClick={toggleRepeat}
          style={{ ...ex.iconBtn, color: repeat !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
          {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
        </button>
      </div>
    </div>
  );
}

// ── Compact bottom bar (always visible) ───────────────────────────────────
export default function MobilePlayerBar({ analyserRef }) {
  const {
    currentTrack, isPlaying, progress, duration,
    togglePlay, nextTrack,
  } = useStore();

  const [expanded, setExpanded] = useState(false);

  // Swipe up to expand
  const touchStartY = useRef(null);
  const onBarTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onBarTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 40) setExpanded(true);
    touchStartY.current = null;
  };

  const color = currentTrack
    ? COLORS[currentTrack.title.charCodeAt(0) % COLORS.length]
    : '#6c63ff';

  return (
    <>
      {/* ── Expanded full-screen sheet ── */}
      {expanded && (
        <div style={bar.overlay}>
          <ExpandedSheet analyserRef={analyserRef} onCollapse={() => setExpanded(false)} />
        </div>
      )}

      {/* ── Compact bottom bar ── */}
      <div
        style={bar.wrap}
        onTouchStart={onBarTouchStart}
        onTouchEnd={onBarTouchEnd}
      >
        {/* Progress line at very top */}
        <MobileSeekBar progress={progress} duration={duration} compact={true} />

        <div style={bar.inner} onClick={() => setExpanded(true)}>
          {/* Cover */}
          <MiniCover track={currentTrack} size={44} />

          {/* Track info */}
          <div style={bar.meta}>
            <div style={bar.title}>
              {currentTrack?.title ?? 'Nothing playing'}
            </div>
            <div style={bar.artist}>
              {currentTrack?.artist ?? 'Add files to start'}
            </div>
          </div>

          {/* Controls — stop propagation so taps don't expand sheet */}
          <div style={bar.btns} onClick={e => e.stopPropagation()}>
            <button
              onClick={prevTrack}
              style={bar.iconBtn}
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              style={{ ...bar.playBtn, background: color }}
            >
              {isPlaying
                ? <Pause size={18} fill="currentColor" />
                : <Play  size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button
              onClick={nextTrack}
              style={bar.iconBtn}
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Compact bar styles ─────────────────────────────────────────────────────
const bar = {
  wrap: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    zIndex: 40,
    background: 'rgba(17,17,24,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  inner: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px 10px',
    cursor: 'pointer',
  },
  meta: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    color: 'var(--text-primary)',
  },
  artist: {
    fontSize: 11, color: 'var(--text-muted)', marginTop: 1,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  btns: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 8,
    background: 'none', border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  playBtn: {
    width: 40, height: 40, borderRadius: '50%',
    border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(0,0,0,0.6)',
  },
};

// ── Expanded sheet styles ──────────────────────────────────────────────────
const ex = {
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(180deg, #13121e 0%, #0a0a0f 100%)',
    borderRadius: '20px 20px 0 0',
    padding: '12px 24px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
    animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
    maxHeight: '95dvh',
    overflowY: 'auto',
  },
  pill: {
    width: 36, height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.15)',
    marginBottom: 16, flexShrink: 0,
  },
  topRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 28,
  },
  collapseBtn: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg-elevated)', border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  nowPlaying: {
    fontSize: 10, fontWeight: 700, letterSpacing: 2,
    color: 'var(--text-muted)',
  },
  queueBtn: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg-elevated)', border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  coverWrap: {
    position: 'relative', marginBottom: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  glow: {
    position: 'absolute', inset: -40,
    pointerEvents: 'none', zIndex: -1,
  },
  info: {
    width: '100%', textAlign: 'center', marginBottom: 28,
  },
  title: {
    fontSize: 20, fontWeight: 700, letterSpacing: -0.3,
    marginBottom: 6, color: 'var(--text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  artist: {
    fontSize: 14, color: 'var(--text-secondary)',
  },
  seekWrap: { width: '100%', marginBottom: 28 },
  timeRow: {
    display: 'flex', justifyContent: 'space-between', marginTop: 8,
  },
  time: { fontSize: 10, color: 'var(--text-muted)' },
  controls: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%',
  },
  iconBtn: {
    background: 'none', border: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer',
    padding: 10, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 64, height: 64, borderRadius: '50%',
    border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 28px rgba(108,99,255,0.5)',
  },
};
