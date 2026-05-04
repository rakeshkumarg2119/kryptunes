🎧 KRYPTUNES
Privacy-first Music Player

🎵 Local files + Google Drive streaming
🔐 No server. No accounts. Pure browser.

🌐 Live Demo

👉 https://kryptunes.vercel.app/

✨ Highlights
⚡ Blazing fast (Vite + React)
🔒 Privacy-first (no backend, no tracking)
☁️ Google Drive streaming
🎚️ 10-band EQ + presets
💾 Session restore (7 days)
🎶 Advanced queue & playlist system
🌈 Beautiful visualizers
📱 Responsive (desktop + mobile)
🧠 Tech Stack
+ React + Vite
+ Zustand (state management)
+ Web Audio API (EQ + visualizer)
+ IndexedDB (offline persistence)
+ File System Access API
+ Google Drive API v3 + Picker
🚀 Features
🎵 Playback
Supports: MP3, WAV, FLAC, OGG, AAC, M4A
Local file playback (no upload)
Google Drive streaming (multi-account)
🎛️ Audio Control
10-band parametric EQ
Built-in presets
Volume + seek control
📚 Library
Playlist management
Queue system
Search + sorting
💡 Smart Persistence
IndexedDB storage (tracks, playlists, EQ, session)
File handles saved (Chrome/Edge)
No re-import after refresh
🎨 UI/UX
Ring visualizer + frequency bars
Drag-to-resize player
Smooth animations
⚙️ Setup
git clone <repo>
cd kryptunes
npm install
cp .env.example .env
npm run dev
🔑 Google Drive Setup
🧩 Step 1 — Google Cloud
Enable:
Google Drive API
Google Picker API
Create:
OAuth Client ID (Web)
API Key
Add origins:
http://localhost:5173
https://kryptunes.vercel.app
🔐 Step 2 — OAuth Consent

Scopes:
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile

👉 Add your Gmail as test user

🔧 Step 3 — .env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_API_KEY=your_api_key
☁️ Step 4 — Vercel Env

Add in dashboard:

Key	Value
VITE_GOOGLE_CLIENT_ID	your_client_id
VITE_GOOGLE_API_KEY	your_api_key

👉 Redeploy after adding

📱 Mobile Fixes (Important)
❗ iOS Safari Limitations
❌ showOpenFilePicker not supported
❌ AudioContext requires user gesture
❌ Vertical sliders break
✅ Fixes
Use <input type="file"> fallback
Resume audio context on tap
Build custom touch sliders
📁 Project Structure
src/
 ├── components/
 ├── hooks/
 ├── store/
 ├── utils/
 └── styles/

 💾 Persistence
Chrome / Edge
File handles saved
Auto-restore after refresh
Safari / Firefox
Manual re-import required
🔁 Session Restore
Saves every 5 seconds
Restores:
Track
Queue
Seek position
Valid for 7 days
🚀 Deployment
npm run build

Deploy to:

Vercel
Netlify
Any static host
📊 Analytics
Integrated with Vercel Analytics
Tracks:
Visitors
Page views
Engagement
📜 License

MIT License © 2026

💬 Final Note

KRYPTUNES is built for people who want
full control over their music without sacrificing privacy.
