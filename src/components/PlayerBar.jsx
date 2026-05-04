import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../utils/fileLoader';
import Visualizer from './Visualizer';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic,
} from 'lucide-react';

const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9'];

// ── Ring visualizer canvas (renders behind cover art) ─────────────────────
function RingCanvas({ analyserRef, isPlaying, color, size }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const canvasSize = size + 140;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = canvasSize * DPR;
    canvas.height = canvasSize * DPR;

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const innerR = size / 2 + 4;
    const outerR = size / 2 + 12;

    const draw = (ts) => {
      rafRef.current = requestAnimationFrame(draw);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(DPR, DPR);

      const analyser = analyserRef?.current;
      const t = ts || 0;

      // ── Glow ring (always visible) ──
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.0015);
      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}${Math.round(40 * pulse).toString(16).padStart(2,'0')}`;
      ctx.lineWidth = 16;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}99`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Dotted outer orbit ──
      const dotCount = 80;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
        const r = outerR + 22;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const alpha = isPlaying
          ? 0.15 + 0.25 * Math.sin(t * 0.002 + i * 0.2)
          : 0.08 + 0.06 * Math.sin(t * 0.001 + i * 0.2);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`;
        ctx.fill();
      }

      if (isPlaying && analyser) {
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);

        // FIX 1 — Mirror: use half the circle per side so both halves
        // always show identical energy — no empty quadrant ever.
        // FIX 2 — Log-scale: concentrates bars on audible range
        // instead of wasting half on inaudible ultra-high frequencies.
        // FIX 3 — Noise floor: always show min bar so circle looks full.
        const barCount = 120;
        const half = barCount / 2;

        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          const pos = i < half ? i : barCount - 1 - i; // mirror
          const logT = Math.pow(pos / half, 1.8);       // log scale
          const idx = Math.floor(logT * bufLen * 0.65);
          const raw = data[Math.min(idx, bufLen - 1)] / 255;
          const val = Math.max(0.06, raw);               // noise floor
          const barH = 4 + val * 52;

          const x1 = cx + Math.cos(angle) * outerR;
          const y1 = cy + Math.sin(angle) * outerR;
          const x2 = cx + Math.cos(angle) * (outerR + barH);
          const y2 = cy + Math.sin(angle) * (outerR + barH);

          const rr = Math.floor(108 + val * 40);
          const gg = Math.floor(99 + val * 120);
          const bb = Math.floor(255 - val * 50);
          const alpha = 0.4 + val * 0.6;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alpha})`;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef, isPlaying, color, canvasSize, size]); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        width: canvasSize,
        height: canvasSize,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

// ── Cover art + ring visualizer wrapper ───────────────────────────────────
function CoverArt({ track, size = 160, analyserRef, isPlaying }) {
  const canvasSize = size + 140;

  const coverEl = (() => {
    // PlayerBar.jsx — CoverArt function, no-track case
  if (!track) {
    return (
    <div style={{
      width: size, height: size, borderRadius: 16, flexShrink: 0,
      position: 'relative', zIndex: 2,
    }}>
      <img 
        src="/kryptunes.PNG" 
        alt="KRYPTUNES"
        style={{ width: size, height: size, borderRadius: 16, objectFit: 'cover' }}
      />
    </div>
  );
}
    const color = COLORS[track.title.charCodeAt(0) % COLORS.length];
    if (track.cover) {
      return (
        <img src={track.cover} alt=""
          style={{
            width: size, height: size, borderRadius: 16,
            objectFit: 'cover', flexShrink: 0,
            position: 'relative', zIndex: 2,
            boxShadow: isPlaying
              ? `0 12px 40px ${color}66, 0 0 0 2px ${color}44`
              : `0 12px 40px ${color}44`,
            transition: 'box-shadow 0.4s ease',
          }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: 16, flexShrink: 0,
        background: `linear-gradient(135deg, ${color}55, ${color}22)`,
        border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        boxShadow: isPlaying
          ? `0 12px 40px ${color}55, 0 0 0 2px ${color}44`
          : `0 12px 40px ${color}33`,
        transition: 'box-shadow 0.4s ease',
      }}>
        <span style={{ fontSize: size * 0.38, color }}>♪</span>
      </div>
    );
  })();

  const ringColor = track ? COLORS[track.title.charCodeAt(0) % COLORS.length] : '#6c63ff';

  return (
    <div style={{
      position: 'relative',
      width: canvasSize,
      height: canvasSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <RingCanvas
        analyserRef={analyserRef}
        isPlaying={isPlaying}
        color={ringColor}
        size={size}
      />
      {coverEl}
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function Tip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && label && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.9)', color: '#fff',
          fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
          padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap',
          pointerEvents: 'none', zIndex: 999,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Seek Bar — gets audioRef from store directly ───────────────────────────
function SeekBar({ progress, duration }) {
  const { audioRef } = useStore();
  const barRef    = useRef(null);
  const dragging  = useRef(false);
  const [hover, setHover]       = useState(false);
  const [localPct, setLocalPct] = useState(null);

  const pct = localPct !== null
    ? localPct
    : (duration > 0 ? Math.min(100, (progress / duration) * 100) : 0);

  const getPct = useCallback((clientX) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    const p = getPct(e.clientX);
    setLocalPct(p * 100);

    const onMove = (ev) => {
      if (!dragging.current) return;
      setLocalPct(getPct(ev.clientX) * 100);
    };
    const onUp = (ev) => {
      if (!dragging.current) return;
      dragging.current = false;
      const p = getPct(ev.clientX);
      setLocalPct(null);
      const audio = audioRef?.current;
      if (audio && duration) audio.currentTime = p * duration;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [audioRef, duration, getPct]);

  const onClick = useCallback((e) => {
    if (dragging.current) return;
    const p = getPct(e.clientX);
    const audio = audioRef?.current;
    if (audio && duration) audio.currentTime = p * duration;
  }, [audioRef, duration, getPct]);

  return (
    <div
      ref={barRef}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        height: hover || dragging.current ? 6 : 4,
        background: 'rgba(255,255,255,0.12)',
        cursor: 'pointer', borderRadius: 4,
        transition: 'height 0.1s',
        width: '100%',
        flexShrink: 0,
      }}
    >
      {/* Fill */}
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${pct}%`,
        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
        borderRadius: 4, pointerEvents: 'none',
      }} />
      {/* Thumb */}
      <div style={{
        position: 'absolute', top: '50%',
        left: `clamp(0px, calc(${pct}% - 6px), calc(100% - 12px))`,
        transform: 'translateY(-50%)',
        width: hover || dragging.current ? 14 : 0,
        height: hover || dragging.current ? 14 : 0,
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 0 8px rgba(108,99,255,0.9)',
        pointerEvents: 'none',
        transition: 'width 0.1s, height 0.1s',
      }} />
    </div>
  );
}

// ── Main PlayerBar — Vertical right-panel layout ──────────────────────────
export default function PlayerBar({ analyserRef }) {
  const {
    currentTrack, isPlaying, volume, progress, duration,
    shuffle, repeat, togglePlay, setVolume, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, setActiveView, activeView,
  } = useStore();

  const repeatLabel = repeat === 'one' ? 'Repeat: One' : repeat === 'all' ? 'Repeat: All' : 'Repeat: Off';

  return (
    <div style={v.panel}>

      {/* ── Scrollable content ── */}
      <div style={v.scroll}>

        {/* Cover */}
        <div style={v.coverWrap}>
          <CoverArt track={currentTrack} size={180} analyserRef={analyserRef} isPlaying={isPlaying} />
        </div>

        {/* Track info */}
        <div style={v.trackInfo}>
          {currentTrack ? (
            <>
              <div style={v.trackTitle} title={currentTrack.title}>
                {currentTrack.title}
              </div>
              <div style={v.trackArtist}>{currentTrack.artist}</div>
              {currentTrack.album && currentTrack.album !== 'Unknown Album' && (
                <div style={v.trackAlbum}>{currentTrack.album}</div>
              )}
              {currentTrack.source === 'gdrive' && <span style={v.badge}>Drive</span>}
            </>
          ) : (
            <div style={v.noTrack}>Open a folder or add files to begin</div>
          )}
        </div>

        {/* ── Seek bar + time ── */}
        <div style={v.seekSection}>
          <SeekBar progress={progress} duration={duration} />
          <div style={v.timeRow}>
            <span className="mono" style={v.time}>{formatTime(progress)}</span>
            <span className="mono" style={v.time}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={v.controls}>
          <Tip label={shuffle ? 'Shuffle: On' : 'Shuffle: Off'}>
            <button onClick={toggleShuffle}
              style={{ ...v.iconBtn, color: shuffle ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              <Shuffle size={16} />
            </button>
          </Tip>

          <Tip label="Previous">
            <button onClick={prevTrack} style={v.iconBtn}>
              <SkipBack size={22} />
            </button>
          </Tip>

          <Tip label={isPlaying ? 'Pause' : 'Play'}>
            <button onClick={togglePlay} style={v.playBtn}>
              {isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play  size={22} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
          </Tip>

          <Tip label="Next">
            <button onClick={nextTrack} style={v.iconBtn}>
              <SkipForward size={22} />
            </button>
          </Tip>

          <Tip label={repeatLabel}>
            <button onClick={toggleRepeat}
              style={{ ...v.iconBtn, color: repeat !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </Tip>
        </div>

        {/* ── Volume + Queue ── */}
        <div style={v.bottom}>
          <Tip label={volume === 0 ? 'Unmute' : 'Mute'}>
            <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} style={v.iconBtn}>
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </Tip>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={v.volSlider}
          />
          <Tip label="Queue">
            <button
              onClick={() => setActiveView(activeView === 'queue' ? 'home' : 'queue')}
              style={{
                ...v.iconBtn,
                color: activeView === 'queue' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              <ListMusic size={18} />
            </button>
          </Tip>
        </div>

      </div>{/* end scroll */}

      {/* ── Visualizer at the bottom ── */}
      <div style={v.vizWrap}>
        <Visualizer analyserRef={analyserRef} />
      </div>

    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const v = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'linear-gradient(180deg, #0d0c18 0%, #111118 60%, #0a0a0f 100%)',
    overflow: 'hidden',
  },

  // Visualizer — full width, fixed at bottom, not scrollable
  vizWrap: {
    width: '100%',
    height: 100,
    flexShrink: 0,
    borderTop: '1px solid var(--border)',
  },

  // Scrollable area
  scroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px 20px',
    gap: 0,
  },

  coverWrap: {
    marginBottom: 4,
    flexShrink: 0,
  },

  trackInfo: {
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
    flexShrink: 0,
  },
  trackTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: 'var(--text-primary)',
    marginBottom: 5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  },
  trackArtist: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginBottom: 3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trackAlbum: {
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  noTrack: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '10px 0',
    lineHeight: 1.6,
  },
  badge: {
    display: 'inline-block',
    marginTop: 6,
    fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
    background: 'rgba(108,99,255,0.2)', color: 'var(--accent-primary)',
    padding: '2px 6px', borderRadius: 4,
  },

  // Seek
  seekSection: {
    width: '100%',
    marginBottom: 24,
    flexShrink: 0,
  },
  timeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  time: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },

  // Controls
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 24,
    flexShrink: 0,
    width: '100%',
  },
  playBtn: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#fff', border: 'none', color: '#000',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 24px rgba(255,255,255,0.18)',
    transition: 'transform 0.1s, box-shadow 0.15s',
  },
  iconBtn: {
    background: 'none', border: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer',
    padding: 8, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s',
    flexShrink: 0,
  },

  // Volume
  bottom: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  volSlider: {
    flex: 1,
    accentColor: 'var(--accent-primary)',
    cursor: 'pointer',
  },
};