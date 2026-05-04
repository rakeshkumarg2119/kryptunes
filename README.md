# KRYPTUNES 🎵

A privacy-first music player. Local files + Google Drive streaming. No server. No accounts. Pure browser.

**Live:** https://kryptunes.vercel.app/

---

## Stack

- React + Vite
- Zustand (state)
- Web Audio API (EQ, visualizer)
- IndexedDB (persistence)
- File System Access API (local file handles)
- Google Drive API v3 + Picker

---

## Features

- Play local MP3/WAV/FLAC/OGG/AAC/M4A
- Stream from Google Drive (multi-account)
- 10-band parametric EQ with presets
- Session restore (picks up where you left off, 7-day window)
- Playlist management
- Queue management
- Ring visualizer + frequency bar visualizer
- Drag-to-resize player panel
- IndexedDB persistence (tracks, playlists, EQ, volume, session)
- File handle persistence (no re-picking folder after refresh on Chrome/Edge)

---

## Setup

```bash
git clone <repo>
cd kryptunes
npm install
cp .env.example .env   # fill in Google credentials
npm run dev
```

---

## Google Drive Setup

### Step 1 — Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create new project (or use existing)
3. **APIs & Services → Enable APIs**
   - Enable **Google Drive API**
   - Enable **Google Picker API**
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://kryptunes.vercel.app
     ```
   - Authorized redirect URIs: (leave empty — not needed for implicit flow)
   - Save → copy **Client ID**
5. **Credentials → Create Credentials → API Key**
   - Copy **API Key**
   - Restrict key: APIs → Google Drive API + Google Picker API
   - HTTP referrer restrictions: `https://kryptunes.vercel.app/*` and `http://localhost:5173/*`

### Step 2 — OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External**
3. Fill app name, support email, developer email
4. Scopes → Add:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Test users → Add your Gmail(s) (required while app in **Testing** mode)
6. Save

> App stays in Testing mode forever for personal use. No Google verification needed.

### Step 3 — Local .env

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_api_key_here
```

### Step 4 — Vercel Environment Variables

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Add:
   | Name | Value |
   |------|-------|
   | `VITE_GOOGLE_CLIENT_ID` | `your_client_id.apps.googleusercontent.com` |
   | `VITE_GOOGLE_API_KEY` | `your_api_key` |
3. **Redeploy** (environment vars only take effect on new deploy)

### Step 5 — Use in App

1. Open app → **Settings**
2. Click **Connect Google Account**
3. Sign in → grant permissions
4. Click **+ Pick Files** → select audio files or a folder
5. Tracks stream directly from Drive

---

## Mobile Fixes (Known Issues → Solutions)

### Problem 1: Sidebar doesn't close after nav tap
`Sidebar.jsx` `closeMobile()` fires correctly but only if `window.innerWidth < 768`. Verify CSS breakpoint matches.

### Problem 2: Player controls not visible on mobile
Right player panel is `display: none` on mobile (correct). Bottom player bar must render. Check `.mobile-bar` display rules in `globals.css`.

### Problem 3: File picker broken on iOS Safari
iOS Safari doesn't support `showOpenFilePicker`. Falls back to `<input type="file">`. The `handleMobileFiles` button in `HomeView.jsx` triggers `mobileFilesRef.current.click()` — this must be called directly from a user tap (no async before click or iOS blocks it).

### Problem 4: Audio not playing on iOS
iOS requires user gesture before `AudioContext` can start. `buildGraph()` in `useAudioEngine.js` creates context — call `_ctx.resume()` inside a tap handler if audio silently fails.

### Problem 5: Vertical EQ sliders broken on mobile
`input[type=range]` with `writingMode: vertical-lr` + `WebkitAppearance: slider-vertical` doesn't work on iOS. Replace with touch-handled custom sliders or use `orient="vertical"` (Firefox only). Real fix: build custom range with `touchmove` handler.

### Problem 6: Cover art / ring canvas too large on small screens
`CoverArt` uses fixed `size=180` in `PlayerBar`. Mobile bottom bar needs smaller size. Pass dynamic size based on viewport.

---

## Project Structure

```
src/
  components/
    App.jsx            — root layout, resize handle
    Sidebar.jsx        — nav + playlists
    PlayerBar.jsx      — cover, controls, seek, volume
    Visualizer.jsx     — frequency bar canvas
    HomeView.jsx       — file picker, album groups
    LibraryView.jsx    — sorted track list
    SearchView.jsx     — debounced search
    QueueView.jsx      — play queue
    EqualizerView.jsx  — 10-band EQ
    PlaylistView.jsx   — playlist detail
    SettingsView.jsx   — Drive accounts, library stats
    TrackRow.jsx       — memoized track row
  hooks/
    useAudioEngine.js  — Web Audio graph, play/pause/seek
  store/
    useStore.js        — Zustand store, all state + actions
  utils/
    db.js              — IndexedDB (tracks, playlists, handles, session)
    fileLoader.js      — File System Access API + ID3v2 parser
    googleDrive.js     — OAuth, Picker, Drive API
  styles/
    globals.css        — CSS vars, animations, responsive breakpoints
```

---

## Local File Persistence

Chrome/Edge only (File System Access API). After opening a folder:
- File handles saved to IndexedDB
- On refresh: `restoreHandles()` requests permission silently
- User sees tracks immediately without re-picking
- Firefox/Safari: must re-pick every session (no handle API)

---

## Session Restore

Last played track + queue + seek position saved to IndexedDB every 5 seconds while playing. Restored on next app load if within 7 days. Clears when user manually picks a new track.

---

## Deployment

```bash
npm run build
# deploy dist/ to Vercel / Netlify / any static host
```

Vercel auto-deploys on push to main. No server needed — fully static.

---

## License

MIT
