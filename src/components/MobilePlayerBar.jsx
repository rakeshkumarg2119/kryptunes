import { useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/fileLoader';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, ChevronDown, ListMusic,
} from 'lucide-react';

const COLORS = ['#6c63ff', '#ff6584', '#43e97b', '#f7971e', '#12c2e9'];
const getColor = (str) => COLORS[(str || '').charCodeAt(0) % COLORS.length];

// ── Cover art ──────────────────────────────────────────────────────────────
function Cover({ track, size }) {
  if (!track) {
    return (
      <img src="/kryptunes.PNG" alt="K"
        style={{ width: size, height: size, borderRadius: size > 60 ? 16 : 8,
          objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  const color = getColor(track.title);
  if (track.cover) {
    return (
      <img src={track.cover} alt=""
        style={{ width: size, height: size, borderRadius: size > 60 ? 16 : 8,
          objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 60 ? 16 : 8,
      flexShrink: 0,
      background: `linear-gradient(135deg, ${color}55, ${color}22)`,
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, color }}>♪</span>
    </div>
  );
}

// ── Touch seek bar ─────────────────────────────────────────────────────────
function TouchSeekBar({ progress, duration, compact }) {
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

  const seek = (pctVal) => {
    const audio = audioRef?.current;
    if (audio && duration) audio.currentTime = pctVal * duration;
  };

  return (
    <div ref={barRef}
      onTouchStart={e => {
        touching.current = true;
        setLocalPct(getPct(e.touches[0].clientX) * 100);
      }}
      onTouchMove={e => {
        if (!touching.current) return;
        e.preventDefault();
        setLocalPct(getPct(e.touches[0].clientX) * 100);
      }}
      onTouchEnd={e => {
        if (!touching.current) return;
        touching.current = false;
        seek(getPct(e.changedTouches[0].clientX));
        setLocalPct(null);
      }}
      style={{
        position: 'relative',
        height: compact ? 3 : 5,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 4, width: '100%', flexShrink: 0,
        touchAction: 'none', cursor: 'pointer',
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
          left: `clamp(0px, calc(${pct}% - 10px), calc(100% - 20px))`,
          transform: 'translateY(-50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', boxShadow: '0 0 10px rgba(108,99,255,0.8)',
        }} />
      )}
    </div>
  );
}

// ── Expanded full-screen sheet ─────────────────────────────────────────────
function ExpandedSheet({ onClose }) {
  const {
    currentTrack, isPlaying, progress, duration,
    shuffle, repeat,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, setActiveView,
  } = useStore();

  const color = getColor(currentTrack?.title);

  // Swipe-down to close
  const touchStartY = useRef(null);

  return (
    <div
      style={ex.backdrop}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={ex.sheet}
        onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          if (touchStartY.current === null) return;
          const dy = e.changedTouches[0].clientY - touchStartY.current;
          if (dy > 60) onClose();
          touchStartY.current = null;
        }}
      >
        {/* Pill */}
        <div style={ex.pill} />

        {/* Top row */}
        <div style={ex.topRow}>
          <button onClick={onClose} style={ex.iconBtn}>
            <ChevronDown size={22} />
          </button>
          <span style={ex.label}>NOW PLAYING</span>
          <button
            onClick={() => { setActiveView('queue'); onClose(); }}
            style={ex.iconBtn}
          >
            <ListMusic size={20} />
          </button>
        </div>

        {/* Big cover */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <Cover track={currentTrack} size={230} />
          <div style={{
            position: 'absolute', inset: -50, zIndex: -1, pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, ${color}30 0%, transparent 70%)`,
          }} />
        </div>

        {/* Info */}
        <div style={ex.info}>
          <div style={ex.title}>{currentTrack?.title ?? 'Nothing playing'}</div>
          <div style={ex.artist}>{currentTrack?.artist ?? 'Add files to start'}</div>
        </div>

        {/* Seek */}
        <div style={{ width: '100%', marginBottom: 24 }}>
          <TouchSeekBar progress={progress} duration={duration} compact={false} />
          <div style={ex.timeRow}>
            <span className="mono" style={ex.time}>{formatTime(progress)}</span>
            <span className="mono" style={ex.time}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={ex.controls}>
          <button onClick={toggleShuffle}
            style={{ ...ex.iconBtn, color: shuffle ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            <Shuffle size={20} />
          </button>
          <button onClick={prevTrack} style={ex.iconBtn}>
            <SkipBack size={30} fill="currentColor" />
          </button>
          <button onClick={togglePlay}
            style={{ ...ex.playBtn, background: color, boxShadow: `0 6px 28px ${color}66` }}>
            {isPlaying
              ? <Pause size={28} fill="currentColor" />
              : <Play  size={28} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>
          <button onClick={nextTrack} style={ex.iconBtn}>
            <SkipForward size={30} fill="currentColor" />
          </button>
          <button onClick={toggleRepeat}
            style={{ ...ex.iconBtn, color: repeat !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact bottom bar ─────────────────────────────────────────────────────
export default function MobilePlayerBar({ analyserRef }) {
  const { currentTrack, isPlaying, progress, duration, togglePlay, nextTrack, prevTrack } = useStore();
  const [expanded, setExpanded] = useState(false);

  // Swipe up to expand
  const touchStartY = useRef(null);
  const color = getColor(currentTrack?.title);

  return (
    <>
      {expanded && <ExpandedSheet onClose={() => setExpanded(false)} />}

      <div
        style={bar.wrap}
        onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          if (touchStartY.current === null) return;
          const dy = touchStartY.current - e.changedTouches[0].clientY;
          if (dy > 40) setExpanded(true);
          touchStartY.current = null;
        }}
      >
        {/* Thin progress line at top of bar */}
        <TouchSeekBar progress={progress} duration={duration} compact={true} />

        <div style={bar.inner}>
          {/* Cover — tap opens sheet */}
          <div onClick={() => setExpanded(true)} style={{ cursor: 'pointer', flexShrink: 0 }}>
            <Cover track={currentTrack} size={44} />
          </div>

          {/* Track info — tap opens sheet */}
          <div style={bar.meta} onClick={() => setExpanded(true)}>
            <div style={bar.title}>{currentTrack?.title ?? 'Nothing playing'}</div>
            <div style={bar.artist}>{currentTrack?.artist ?? 'Tap + to add music'}</div>
          </div>

          {/* Controls — stop propagation */}
          <div style={bar.controls} onClick={e => e.stopPropagation()}>
            <button onClick={prevTrack} style={bar.ctrlBtn}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button onClick={togglePlay}
              style={{ ...bar.playBtn, background: currentTrack ? color : 'var(--bg-overlay)' }}>
              {isPlaying
                ? <Pause size={18} fill="currentColor" />
                : <Play  size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button onClick={nextTrack} style={bar.ctrlBtn}>
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const bar = {
  wrap: {
    background: 'rgba(13,12,24,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  inner: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px 10px',
  },
  meta: {
    flex: 1, minWidth: 0, cursor: 'pointer',
  },
  title: {
    fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    color: 'var(--text-primary)',
  },
  artist: {
    fontSize: 11, color: 'var(--text-muted)', marginTop: 1,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  controls: {
    display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
  },
  ctrlBtn: {
    width: 36, height: 36, borderRadius: 8,
    background: 'none', border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  playBtn: {
    width: 42, height: 42, borderRadius: '50%',
    border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 2px 14px rgba(108,99,255,0.4)',
  },
};

const ex = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: 'linear-gradient(180deg, #16152a 0%, #0a0a0f 100%)',
    borderRadius: '22px 22px 0 0',
    padding: '14px 24px',
    paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
    animation: 'slideUp 0.32s cubic-bezier(0.32,0.72,0,1)',
    maxHeight: '96dvh',
    overflowY: 'auto',
  },
  pill: {
    width: 40, height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    marginBottom: 18, flexShrink: 0,
  },
  topRow: {
    width: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 32,
  },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: 2.5,
    color: 'var(--text-muted)',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    background: 'var(--bg-elevated)', border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  info: {
    width: '100%', textAlign: 'center', marginBottom: 28,
  },
  title: {
    fontSize: 20, fontWeight: 700, letterSpacing: -0.3,
    color: 'var(--text-primary)', marginBottom: 6,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  artist: {
    fontSize: 14, color: 'var(--text-secondary)',
  },
  timeRow: {
    display: 'flex', justifyContent: 'space-between', marginTop: 10,
  },
  time: { fontSize: 10, color: 'var(--text-muted)' },
  controls: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, width: '100%',
  },
  playBtn: {
    width: 68, height: 68, borderRadius: '50%',
    border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
};