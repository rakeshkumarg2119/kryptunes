import { useStore } from '../store/useStore';

const PRESETS = {
  Flat:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bass:     [8, 7, 5, 2, 0, -1, -1, -1, -1, -1],
  Treble:   [-2, -2, -1, 0, 1, 3, 5, 7, 8, 8],
  Vocal:    [-3, -2, 0, 2, 4, 4, 2, 0, -1, -2],
  Rock:     [5, 4, 2, -1, -2, 0, 2, 4, 5, 5],
  Jazz:     [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
  Classical:[4, 3, 2, 1, 0, -1, -1, 0, 2, 3],
  Electronic:[4, 3, 0, -2, -1, 2, 3, 4, 4, 5],
};

export default function EqualizerView() {
  const { eqBands, setEqBand, eqEnabled, toggleEq } = useStore();

  const applyPreset = (gains) => {
    gains.forEach((g, i) => setEqBand(i, g));
  };

  return (
    <div style={styles.view}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Equalizer</div>
          <div style={styles.sub}>10-band parametric EQ</div>
        </div>
        <button onClick={toggleEq} style={{
          ...styles.toggle,
          background: eqEnabled ? 'var(--accent-primary)' : 'var(--bg-overlay)',
          boxShadow: eqEnabled ? '0 0 16px var(--accent-glow)' : 'none',
        }}>
          {eqEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Presets */}
      <div style={styles.presets}>
        {Object.entries(PRESETS).map(([name, gains]) => (
          <button
            key={name}
            onClick={() => applyPreset(gains)}
            style={styles.presetBtn}
          >
            {name}
          </button>
        ))}
      </div>

      {/* EQ Bands */}
      <div style={styles.eq}>
        {eqBands.map((band, i) => (
          <div key={i} style={styles.band}>
            <div style={styles.bandTop}>
              <span className="mono" style={styles.gainVal}>
                {band.gain > 0 ? '+' : ''}{band.gain}
              </span>
            </div>
            <div style={styles.sliderWrap}>
              <div style={styles.zeroLine} />
              <input
                type="range"
                min="-12" max="12" step="0.5"
                value={band.gain}
                onChange={e => setEqBand(i, parseFloat(e.target.value))}
                disabled={!eqEnabled}
                style={styles.slider}
                orient="vertical"
              />
            </div>
            <div style={styles.bandLabel} className="mono">{band.label}</div>
          </div>
        ))}
      </div>

      {/* Gain reference */}
      <div style={styles.gainRef}>
        <span>+12 dB</span>
        <span>0 dB</span>
        <span>-12 dB</span>
      </div>
    </div>
  );
}

const styles = {
  view: { flex: 1, overflowY: 'auto', animation: 'fadeIn 0.3s ease' },
  header: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '28px 28px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(160deg, #161624 0%, var(--bg-surface) 100%)',
  },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  toggle: {
    padding: '8px 20px', borderRadius: 8, border: 'none',
    color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 1,
    cursor: 'pointer', fontFamily: 'DM Mono, monospace',
    transition: 'all 0.2s',
  },
  presets: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  presetBtn: {
    padding: '5px 12px', borderRadius: 6,
    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
    transition: 'all 0.1s',
  },
  eq: {
    display: 'flex', alignItems: 'flex-end', gap: 4,
    padding: '24px 28px',
    height: 280,
  },
  band: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100%', gap: 8,
  },
  bandTop: { height: 18, display: 'flex', alignItems: 'center' },
  gainVal: {
    fontSize: 9, color: 'var(--accent-primary)', fontWeight: 500,
  },
  sliderWrap: {
    flex: 1, position: 'relative',
    display: 'flex', justifyContent: 'center',
    width: '100%',
  },
  zeroLine: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    height: 1, background: 'rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
  slider: {
    writingMode: 'vertical-lr',
    direction: 'rtl',
    width: 28,
    height: '100%',
    accentColor: 'var(--accent-primary)',
    cursor: 'pointer',
    appearance: 'slider-vertical',
    WebkitAppearance: 'slider-vertical',
  },
  bandLabel: {
    fontSize: 9, color: 'var(--text-muted)',
    textAlign: 'center', letterSpacing: 0.3,
  },
  gainRef: {
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '0 28px 20px',
    fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace',
    height: 80,
  },
};
