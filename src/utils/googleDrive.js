const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY || '';

const SCOPE =
  'https://www.googleapis.com/auth/drive.readonly ' +
  'https://www.googleapis.com/oauth2/auth/userinfo.email ' +
  'https://www.googleapis.com/auth/userinfo.profile';

// In-memory token store
const tokenStore = {};
let gapiReady = false;

export function isConfigured() {
  return Boolean(CLIENT_ID && API_KEY);
}

// ── Load Google APIs safely ─────────────────────────────────────────────
export async function loadGoogleAPIs() {
  if (gapiReady) return;

  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';

    s.onload = () => {
      if (!window.gapi) return reject(new Error('gapi failed to load'));

      window.gapi.load('client:picker', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            ],
          });

          gapiReady = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    };

    s.onerror = () => reject(new Error('Failed to load Google API script'));

    document.body.appendChild(s);
  });

  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.body.appendChild(s);
  });
}

// ── Fetch user info ─────────────────────────────────────────────────────
async function fetchUserInfo(token) {
  const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!r.ok) throw new Error('Failed to fetch user info');
  return r.json();
}

// ── Add account ─────────────────────────────────────────────────────────
export function addAccount() {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGoogleAPIs();

      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,

        callback: async (resp) => {
          if (resp.error) return reject(resp.error);

          try {
            const info = await fetchUserInfo(resp.access_token);

            const account = {
              email: info.email,
              displayName: info.name || info.email,
              picture: info.picture || null,
              accessToken: resp.access_token,
              expiresAt: Date.now() + (resp.expires_in || 3600) * 1000,
            };

            tokenStore[info.email] = account;
            resolve(account);
          } catch (e) {
            reject(e);
          }
        },
      });

      tc.requestAccessToken({ prompt: 'select_account' });
    } catch (e) {
      reject(e);
    }
  });
}

// ── Refresh account ──────────────────────────────────────────────────────
export function refreshAccount(email) {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGoogleAPIs();

      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        hint: email,

        callback: async (resp) => {
          if (resp.error) return reject(resp.error);

          try {
            const info = await fetchUserInfo(resp.access_token);

            const account = {
              ...tokenStore[email],
              email: info.email,
              accessToken: resp.access_token,
              expiresAt: Date.now() + (resp.expires_in || 3600) * 1000,
            };

            tokenStore[info.email] = account;
            resolve(account);
          } catch (e) {
            reject(e);
          }
        },
      });

      tc.requestAccessToken({ prompt: '' });
    } catch (e) {
      reject(e);
    }
  });
}

// ── Restore account ─────────────────────────────────────────────────────
export function restoreAccount(account) {
  if (account?.accessToken && account?.email) {
    tokenStore[account.email] = account;
  }
}

// ── Get token safely ────────────────────────────────────────────────────
export function getToken(email) {
  const acc = tokenStore[email];
  if (!acc) return null;

  if (acc.expiresAt < Date.now() + 60000) return null;
  return acc.accessToken;
}

// ── Validate token ──────────────────────────────────────────────────────
export function isTokenValid(email) {
  return Boolean(getToken(email));
}

// ── Revoke account ──────────────────────────────────────────────────────
export function revokeAccount(email) {
  const acc = tokenStore[email];

  if (acc?.accessToken) {
    window.google?.accounts?.oauth2?.revoke(acc.accessToken, () => {});
  }

  delete tokenStore[email];
}

// ── Open picker ─────────────────────────────────────────────────────────
// googleDrive.js — replace openPickerForAccount

export async function openPickerForAccount(email) {
  await loadGoogleAPIs();
  const token = getToken(email);
  if (!token) throw new Error('TOKEN_EXPIRED');

  return new Promise((resolve, reject) => {
    try {
      // View 1: pick audio files directly
      const fileView = new window.google.picker.DocsView()
        .setIncludeFolders(false)
        .setMimeTypes('audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac,audio/mp4,audio/x-m4a');

      // View 2: pick a folder — then we list its contents via Drive API
      const folderView = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder');

      const picker = new window.google.picker.PickerBuilder()
        .addView(fileView)
        .addView(folderView)
        .setOAuthToken(token)
        .setDeveloperKey(API_KEY)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const picked = data.docs;
            // If user picked a folder, expand it
            if (picked[0]?.mimeType === 'application/vnd.google-apps.folder') {
              try {
                const files = await listFolderAudio(picked[0].id, token);
                resolve(files);
              } catch(e) { reject(e); }
            } else {
              resolve(picked);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .build();

      picker.setVisible(true);
    } catch (e) {
      reject(e);
    }
  });
}

// List all audio files inside a Drive folder (recursive)
async function listFolderAudio(folderId, token) {
  const audioMimes = [
    'audio/mpeg','audio/wav','audio/ogg','audio/flac',
    'audio/aac','audio/mp4','audio/x-m4a'
  ].map(m => `mimeType='${m}'`).join(' or ');

  const q = encodeURIComponent(
    `'${folderId}' in parents and (${audioMimes}) and trashed=false`
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink)&pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Drive API list failed: ' + res.status);
  const data = await res.json();

  // Shape matches picker docs format
  return (data.files || []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    thumbnailUrl: f.thumbnailLink || null,
  }));
}

// ── Convert docs → tracks ──────────────────────────────────────────────
export function docsToTracks(docs, email, displayName) {
  return docs.map((doc) => {
    const token = getToken(email);
    if (!token) return null;

    const name = doc.name.replace(/\.[^/.]+$/, '');
    const parts = name.split(' - ');

    const title =
      parts.length > 1 ? parts.slice(1).join(' - ').trim() : name;

    const artist =
      parts.length > 1 ? parts[0].trim() : 'Unknown Artist';

    return {
      id: `gdrive-${doc.id}`,
      title,
      artist,
      album: displayName || 'Google Drive',
      duration: 0,
      file: null,
      url: token
        ? `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media&access_token=${token}`
        : null,
      driveId: doc.id,
      driveEmail: email,
      source: 'gdrive',
      cover: doc.thumbnailUrl || null,
    };
  }).filter(Boolean);
}

// ── Refresh streaming URL safely ───────────────────────────────────────
export function refreshTrackUrl(track) {
  const token = getToken(track.driveEmail);
  if (!token) return null;

  return `https://www.googleapis.com/drive/v3/files/${track.driveId}?alt=media&access_token=${token}`;
}