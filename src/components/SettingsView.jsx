import { useState } from 'react';
import { useStore } from '../store/useStore';
import * as GDrive from '../utils/googleDrive';
import * as DB from '../utils/db';
import {
  Plus, Trash2, RefreshCw, CloudIcon, HardDrive,
  CheckCircle, AlertCircle, Settings, Info,
} from 'lucide-react';

export default function SettingsView() {
  const { driveAccounts, addDriveAccount, removeDriveAccount, addTracks, tracks, setTracks } = useStore();
  const [loading, setLoading] = useState(null); // email or 'new'
  const [error, setError] = useState('');
  const [pickingFor, setPickingFor] = useState(null);

  const handleAddAccount = async () => {
    if (!GDrive.isConfigured()) {
      setError('Add REACT_APP_GOOGLE_CLIENT_ID and REACT_APP_GOOGLE_API_KEY to .env first');
      return;
    }
    setLoading('new');
    setError('');
    try {
      const account = await GDrive.addAccount();
      addDriveAccount(account);
      GDrive.restoreAccount(account);
    } catch (e) {
      setError('Auth failed: ' + (e?.message || e));
    } finally {
      setLoading(null);
    }
  };

  const handleRefresh = async (email) => {
    setLoading(email);
    setError('');
    try {
      const account = await GDrive.refreshAccount(email);
      addDriveAccount(account);
      GDrive.restoreAccount(account);
      // Rebuild URLs for this account's tracks with fresh token
      const updated = tracks.map(t =>
        t.source === 'gdrive' && t.driveEmail === email
          ? { ...t, url: GDrive.refreshTrackUrl(t) }
          : t
      );
      setTracks(updated);
    } catch (e) {
      setError('Refresh failed: ' + (e?.message || e));
    } finally {
      setLoading(null);
    }
  };

  const handlePickFiles = async (account) => {
    setPickingFor(account.email);
    setError('');
    try {
      // Restore token in memory first
      GDrive.restoreAccount(account);
      if (!GDrive.isTokenValid(account.email)) {
        // Token expired - need re-auth
        const refreshed = await GDrive.refreshAccount(account.email);
        addDriveAccount(refreshed);
        GDrive.restoreAccount(refreshed);
      }
      const docs = await GDrive.openPickerForAccount(account.email);
      if (docs.length > 0) {
        const newTracks = GDrive.docsToTracks(docs, account.email, account.displayName);
        addTracks(newTracks);
      }
    } catch (e) {
      if (e?.message === 'TOKEN_EXPIRED') setError(`Token expired for ${account.email} — click Refresh`);
      else setError('Picker error: ' + (e?.message || e));
    } finally {
      setPickingFor(null);
    }
  };

  const handleRemove = (email) => {
    GDrive.revokeAccount(email);
    removeDriveAccount(email);
  };

  const handleClearLibrary = () => {
    if (window.confirm('Remove all tracks? Playlists stay.')) {
      setTracks([]);
    }
  };

  const localCount = tracks.filter(t => t.source === 'local').length;
  const driveCount = tracks.filter(t => t.source === 'gdrive').length;

  return (
    <div style={s.view}>
      <div style={s.header}>
        <Settings size={20} />
        <div style={s.title}>Settings</div>
      </div>

      {/* Google Drive Accounts */}
      <section style={s.section}>
        <div style={s.sectionTitle}>
          <CloudIcon size={15} /> Google Drive Accounts
        </div>
        <div style={s.sectionDesc}>
          Connect multiple Google accounts. Each account's Drive files stream independently.
          Tracks from all accounts play simultaneously — no switching needed.
        </div>

        {error && (
          <div style={s.errorBanner}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Account list */}
        <div style={s.accountList}>
          {driveAccounts.length === 0 && (
            <div style={s.noAccounts}>No Google accounts connected</div>
          )}
          {driveAccounts.map((acc) => {
            const valid = GDrive.isTokenValid(acc.email);
            return (
              <div key={acc.email} style={s.accountCard}>
                <div style={s.accountLeft}>
                  {acc.picture
                    ? <img src={acc.picture} alt="" style={s.avatar} />
                    : <div style={s.avatarPlaceholder}>{acc.displayName?.[0] || '?'}</div>
                  }
                  <div>
                    <div style={s.accountName}>{acc.displayName}</div>
                    <div style={s.accountEmail}>{acc.email}</div>
                    <div style={{ ...s.tokenStatus, color: valid ? 'var(--accent-tertiary)' : '#ff6584' }}>
                      {valid ? <><CheckCircle size={11} /> Active</> : <><AlertCircle size={11} /> Token expired</>}
                    </div>
                    <div style={s.tracksBadge}>
                      {tracks.filter(t => t.driveEmail === acc.email).length} tracks loaded
                    </div>
                  </div>
                </div>
                <div style={s.accountActions}>
                  <button
                    onClick={() => handlePickFiles(acc)}
                    disabled={pickingFor === acc.email}
                    style={s.btnAccent}
                  >
                    {pickingFor === acc.email ? 'Opening...' : '+ Pick Files'}
                  </button>
                  <button
                    onClick={() => handleRefresh(acc.email)}
                    disabled={loading === acc.email}
                    style={s.btnGhost}
                    title="Refresh token"
                  >
                    <RefreshCw size={13} style={loading === acc.email ? s.spin : {}} />
                    {loading === acc.email ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button onClick={() => handleRemove(acc.email)} style={s.btnDanger} title="Remove account">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleAddAccount} disabled={loading === 'new'} style={s.addAccountBtn}>
          {loading === 'new' ? (
            <><RefreshCw size={15} style={s.spin} /> Connecting...</>
          ) : (
            <><Plus size={15} /> Connect Google Account</>
          )}
        </button>

        {!GDrive.isConfigured() && (
          <div style={s.infoBox}>
            <Info size={13} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Google API credentials needed</div>
              <div>Copy <code style={s.code}>.env.example</code> → <code style={s.code}>.env</code> and fill in your credentials from Google Cloud Console.</div>
            </div>
          </div>
        )}
      </section>

      {/* Library stats */}
      <section style={s.section}>
        <div style={s.sectionTitle}><HardDrive size={15} /> Library</div>
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statNum}>{tracks.length}</div>
            <div style={s.statLabel}>Total Tracks</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{localCount}</div>
            <div style={s.statLabel}>Local</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{driveCount}</div>
            <div style={s.statLabel}>From Drive</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{driveAccounts.length}</div>
            <div style={s.statLabel}>Drive Accounts</div>
          </div>
        </div>
        <button onClick={handleClearLibrary} style={s.btnDangerOutline}>
          <Trash2 size={13} /> Clear Library
        </button>
      </section>

      {/* Cross-device info */}
      <section style={s.section}>
        <div style={s.sectionTitle}><Info size={15} /> Cross-Device Behaviour</div>
        <div style={s.infoList}>
          <div style={s.infoRow}>
            <span style={{ ...s.dot, background: 'var(--accent-tertiary)' }} />
            <div><strong>Google Drive tracks</strong> — play on any device. Open the app on phone/tablet, reconnect the same Google account, pick the same files. Stream cross-platform.</div>
          </div>
          <div style={s.infoRow}>
            <span style={{ ...s.dot, background: '#ff6584' }} />
            <div><strong>Local tracks</strong> — tied to this machine. Browser security prevents remote access to local files. To use on another device, upload to Google Drive first.</div>
          </div>
          <div style={s.infoRow}>
            <span style={{ ...s.dot, background: 'var(--accent-primary)' }} />
            <div><strong>Playlists & EQ settings</strong> — stored in this browser's IndexedDB. Not synced across devices (no server). Export/import coming soon.</div>
          </div>
          <div style={s.infoRow}>
            <span style={{ ...s.dot, background: '#f7971e' }} />
            <div><strong>Local track list after refresh</strong> — metadata persists, but you must re-open the folder so the browser can re-read the files (browser security).</div>
          </div>
        </div>
      </section>
    </div>
  );
}

const s = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '28px 28px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(160deg, #161624 0%, var(--bg-surface) 100%)',
  },
  title: { fontSize: 24, fontWeight: 800, letterSpacing: -0.5 },
  section: {
    padding: '24px 28px',
    borderBottom: '1px solid var(--border)',
  },
  sectionTitle: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
    color: 'var(--text-primary)', marginBottom: 8,
  },
  sectionDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,101,132,0.1)', border: '1px solid rgba(255,101,132,0.3)',
    borderRadius: 8, padding: '10px 14px',
    color: '#ff6584', fontSize: 12, marginBottom: 14,
  },
  accountList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  noAccounts: { fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' },
  accountCard: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    background: 'var(--bg-elevated)', borderRadius: 10,
    padding: '14px 16px', gap: 12,
    border: '1px solid var(--border)',
  },
  accountLeft: { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 },
  avatar: { width: 38, height: 38, borderRadius: '50%', flexShrink: 0 },
  avatarPlaceholder: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
  },
  accountName: { fontWeight: 600, fontSize: 13, marginBottom: 2 },
  accountEmail: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 },
  tokenStatus: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, marginBottom: 3 },
  tracksBadge: { fontSize: 10, color: 'var(--text-muted)' },
  accountActions: { display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 },
  addAccountBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 10,
    background: 'var(--accent-primary)', color: '#fff',
    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    fontFamily: 'inherit', boxShadow: '0 4px 16px var(--accent-glow)',
    transition: 'opacity 0.15s',
  },
  btnAccent: {
    padding: '6px 12px', borderRadius: 7,
    background: 'rgba(108,99,255,0.2)', color: 'var(--accent-primary)',
    border: '1px solid rgba(108,99,255,0.3)',
    cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
  },
  btnGhost: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 7,
    background: 'none', color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
  },
  btnDanger: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px 10px', borderRadius: 7,
    background: 'rgba(255,101,132,0.1)', color: '#ff6584',
    border: '1px solid rgba(255,101,132,0.2)',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnDangerOutline: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 14, padding: '8px 16px', borderRadius: 8,
    background: 'none', color: '#ff6584',
    border: '1px solid rgba(255,101,132,0.3)',
    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
    marginBottom: 4,
  },
  statCard: {
    background: 'var(--bg-elevated)', borderRadius: 10,
    padding: '14px', textAlign: 'center',
    border: '1px solid var(--border)',
  },
  statNum: { fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' },
  statLabel: { fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 },
  infoBox: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
    borderRadius: 8, padding: '12px 14px', marginTop: 14,
    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
  },
  code: {
    fontFamily: 'DM Mono, monospace', fontSize: 11,
    background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 4,
  },
  infoList: { display: 'flex', flexDirection: 'column', gap: 12 },
  infoRow: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  spin: { animation: 'spin 0.8s linear infinite' },
};
