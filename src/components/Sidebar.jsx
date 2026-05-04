import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Home, Library, Search, ListMusic, Plus, Trash2,
  Music, Settings, X,
} from 'lucide-react';

export default function Sidebar() {
  const {
    activeView, setActiveView, playlists, createPlaylist,
    setActivePlaylist, deletePlaylist, toggleSidebar,
  } = useStore();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const nav = [
    { id: 'home',      icon: <Home size={17} />,      label: 'Home'      },
    { id: 'library',   icon: <Library size={17} />,   label: 'Library'   },
    { id: 'search',    icon: <Search size={17} />,    label: 'Search'    },
    { id: 'queue',     icon: <ListMusic size={17} />, label: 'Queue'     },
    { id: 'equalizer', icon: <Music size={17} />,     label: 'Equalizer' },
    { id: 'settings',  icon: <Settings size={17} />,  label: 'Settings'  },
  ];

  const handleCreate = () => {
    if (newName.trim()) {
      createPlaylist(newName.trim());
      setNewName('');
      setCreating(false);
    }
  };

  // Close sidebar only on mobile
  const closeMobile = () => {
    if (window.innerWidth < 768) toggleSidebar();
  };

  const go = (id) => {
    setActiveView(id);
    closeMobile();
  };

  return (
    <div style={s.sidebar}>
      <div style={s.top}>
        <div style={s.logo}>
          <img src="/kryptunes.PNG" alt="K" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover' }} />
          <span style={s.logoText}>KRYPTUNES</span>
        </div>
        {/* X close button — only shown on mobile via .sidebar-close class */}
        <button
          className="sidebar-close"
          onClick={toggleSidebar}
          style={s.closeBtn}
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      <nav style={s.nav}>
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            style={{ ...s.navItem, ...(activeView === item.id ? s.navActive : {}) }}
          >
            <span style={s.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionLabel}>PLAYLISTS</span>
          <button onClick={() => setCreating(c => !c)} style={s.addBtn}>
            <Plus size={14} />
          </button>
        </div>

        {creating && (
          <div style={s.createRow}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Name..."
              style={s.createInput}
            />
            <button onClick={handleCreate} style={s.createConfirm}>+</button>
          </div>
        )}

        <div style={s.playlists}>
          {playlists.length === 0 && (
            <div style={s.empty}>No playlists</div>
          )}
          {playlists.map(pl => (
            <div key={pl.id} style={s.plItem}>
              <button
                onClick={() => { setActivePlaylist(pl); closeMobile(); }}
                style={s.plBtn}
              >
                <div style={s.plIcon}>♫</div>
                <div style={s.plMeta}>
                  <div style={s.plName}>{pl.name}</div>
                  <div style={s.plCount}>{pl.tracks.length} tracks</div>
                </div>
              </button>
              <button onClick={() => deletePlaylist(pl.id)} style={s.delBtn}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  sidebar: {
    width: 'var(--sidebar-w)', height: '100%',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  top: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 16px 14px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
 // Sidebar.jsx — logoIcon change
  logoIcon: {
  width: 30, height: 30, borderRadius: 7,
  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff',
},
  logoText: {
    fontWeight: 800, fontSize: 16, letterSpacing: 3,
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  closeBtn: {
    width: 30, height: 30, borderRadius: 6, border: 'none',
    background: 'var(--bg-overlay)', color: 'var(--text-muted)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  nav: {
    padding: '10px 10px',
    display: 'flex', flexDirection: 'column', gap: 2,
    flexShrink: 0,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)',
    cursor: 'pointer', background: 'none', border: 'none',
    transition: 'all 0.1s', textAlign: 'left', width: '100%',
  },
  navActive: {
    background: 'var(--bg-overlay)', color: 'var(--text-primary)',
  },
  navIcon: { display: 'flex', flexShrink: 0 },
  section: {
    flex: 1, display: 'flex', flexDirection: 'column',
    borderTop: '1px solid var(--border)', overflow: 'hidden',
    minHeight: 0,
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px 8px', flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-muted)',
  },
  addBtn: {
    width: 22, height: 22, borderRadius: 5, background: 'var(--bg-overlay)',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', border: 'none',
  },
  createRow: {
    display: 'flex', gap: 4, padding: '0 10px 8px', flexShrink: 0,
  },
  createInput: {
    flex: 1, padding: '6px 10px', borderRadius: 6,
    background: 'var(--bg-overlay)', border: '1px solid var(--border-active)',
    color: 'var(--text-primary)', fontSize: 12, outline: 'none',
  },
  createConfirm: {
    width: 28, height: 28, borderRadius: 6, background: 'var(--accent-primary)',
    color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  playlists: { flex: 1, overflowY: 'auto', padding: '0 8px 10px' },
  plItem: {
    display: 'flex', alignItems: 'center', borderRadius: 8, marginBottom: 2,
  },
  plBtn: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 8px', background: 'none', border: 'none',
    cursor: 'pointer', borderRadius: 8, textAlign: 'left', color: 'var(--text-primary)',
  },
  plIcon: {
    width: 28, height: 28, borderRadius: 6, background: 'var(--bg-overlay)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, flexShrink: 0,
  },
  plMeta: { minWidth: 0 },
  plName: {
    fontSize: 12, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  plCount: { fontSize: 10, color: 'var(--text-muted)', marginTop: 1 },
  delBtn: {
    padding: 5, background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 4,
  },
  empty: {
    fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 0',
  },
};