import { useEffect, useState, useRef, useCallback } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useStore } from './store/useStore';
import * as GDrive from './utils/googleDrive';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobilePlayerBar from './components/MobilePlayerBar';
import HomeView from './components/HomeView';
import LibraryView from './components/LibraryView';
import SearchView from './components/SearchView';
import QueueView from './components/QueueView';
import EqualizerView from './components/EqualizerView';
import PlaylistView from './components/PlaylistView';
import SettingsView from './components/SettingsView';
import { Menu } from 'lucide-react';

const MIN_PLAYER_W = 280;
const MAX_PLAYER_W = 520;
const DEFAULT_PLAYER_W = 340;

export default function App() {
  const { audioRef, analyserRef } = useAudioEngine();
  const { activeView, initDB, dbReady, sidebarOpen, toggleSidebar, setActiveView } = useStore();
  const [playerWidth, setPlayerWidth] = useState(() => {
    const saved = localStorage.getItem('KRYPTUNES-player-width');
    return saved ? parseInt(saved) : DEFAULT_PLAYER_W;
  });
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    initDB().then(() => {
      const { driveAccounts } = useStore.getState();
      driveAccounts.forEach(acc => GDrive.restoreAccount(acc));
    });
  }, []); // eslint-disable-line

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = playerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX;
      const newW = Math.max(MIN_PLAYER_W, Math.min(MAX_PLAYER_W, startW.current + delta));
      setPlayerWidth(newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setPlayerWidth(w => { localStorage.setItem('KRYPTUNES-player-width', w); return w; });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [playerWidth]);

  if (!dbReady) {
    return (
      <div style={s.loading}>
        <img
          src="/kryptunes.PNG"
          alt="KRYPTUNES"
          style={{
            width: 120, height: 120, borderRadius: 24,
            animation: 'pulse-glow 5s ease-in-out infinite',
            objectFit: 'cover',
          }}
        />
        <div style={s.loadingText}>KRYPTUNES</div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'home':      return <HomeView />;
      case 'library':   return <LibraryView />;
      case 'search':    return <SearchView />;
      case 'queue':     return <QueueView />;
      case 'equalizer': return <EqualizerView />;
      case 'playlist':  return <PlaylistView />;
      case 'settings':  return <SettingsView />;
      default:          return <HomeView />;
    }
  };

  return (
    <div style={s.root}>

      {/* Mobile dim overlay — sidebar */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={toggleSidebar} style={s.overlay} />
      )}

      <div style={s.layout}>
        {/* Left Sidebar */}
        <div
          className="sidebar-wrap"
          style={{
            ...s.sidebarWrap,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <Sidebar />
        </div>

        {/* Main content */}
        <main style={s.main}>
          {/* Mobile topbar */}
          <div className="mobile-bar" style={s.mobileBar}>
            <button onClick={toggleSidebar} style={s.menuBtn}><Menu size={19} /></button>
            <span style={s.mobileTitle}>KRYPTUNES</span>
            <div style={{ width: 36 }} />
          </div>

          <div style={s.viewWrap}>
            {renderView()}
          </div>
        </main>

        {/* Right player panel — desktop only */}
        <div className="right-player-panel" style={{ ...s.rightPanel, width: playerWidth }}>
          <div
            style={s.dragHandle}
            onMouseDown={onDragStart}
            title="Drag to resize"
          />
          <PlayerBar analyserRef={analyserRef} vertical />
        </div>
      </div>

      {/* ── Mobile bottom player bar — only on mobile ── */}
      <div className="mobile-player-bar">
        <MobilePlayerBar analyserRef={analyserRef} />
      </div>

    </div>
  );
}

const s = {
  root: { height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  loading: {
    height: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    background: 'var(--bg-base)',
  },
  loadingText: {
    fontWeight: 800, fontSize: 24, letterSpacing: 6,
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    zIndex: 49,
  },
  layout: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  sidebarWrap: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    zIndex: 50, transition: 'transform 0.25s ease',
  },
  main: {
    flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    minWidth: 0,
    marginLeft: 'var(--sidebar-w)',
  },
  mobileBar: {
    display: 'none',
    alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)', flexShrink: 0,
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 8,
    background: 'var(--bg-elevated)', border: 'none',
    color: 'var(--text-primary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  mobileTitle: {
    fontWeight: 800, fontSize: 15, letterSpacing: 3,
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  viewWrap: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  rightPanel: {
    flexShrink: 0,
    height: '100%',
    background: 'var(--bg-surface)',
    borderLeft: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  dragHandle: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    cursor: 'col-resize',
    zIndex: 10,
    background: 'transparent',
    transition: 'background 0.15s',
  },
};