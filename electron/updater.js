'use strict';

/**
 * In-app GitHub release updates.
 * 1) Compare local version to the newest published GitHub release tag.
 * 2) On accept: download the Setup / Portable exe inside the client (no browser).
 * 3) On install: run the NSIS installer (or swap the portable exe) and relaunch.
 *
 * Prefer electron-updater when latest.yml exists; otherwise download the release
 * asset URL directly. Builds are unsigned, so code-signature checks are off.
 */

const { app, net } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GITHUB_OWNER = 'blightyboy';
const GITHUB_REPO = 'forest-survivor';
const RELEASES_API =
  'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases?per_page=10';
const RELEASES_PAGE =
  'https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases/latest';

/** @type {import('electron').BrowserWindow | null} */
let win = null;
let autoUpdater = null;
let pendingInfo = null;
let downloading = false;
/** Path to a manually downloaded installer/portable exe (when not using electron-updater). */
let manualPackagePath = null;
let useManualInstall = false;

function isPortable() {
  return !!process.env.PORTABLE_EXECUTABLE_DIR;
}

function normalizeVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^v/i, '')
    .replace(/^V/, '');
}

function compareVersions(a, b) {
  const na = normalizeVersion(a);
  const nb = normalizeVersion(b);
  if (na === nb) return 0;

  const parse = (s) => {
    const [core, pre] = s.split('-');
    const parts = (core || '0').split('.').map((x) => parseInt(x, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return { parts, pre: pre || '' };
  };

  const A = parse(na);
  const B = parse(nb);
  for (let i = 0; i < 3; i++) {
    if (A.parts[i] !== B.parts[i]) return A.parts[i] - B.parts[i];
  }
  if (!A.pre && B.pre) return 1;
  if (A.pre && !B.pre) return -1;
  if (A.pre === B.pre) return 0;
  return A.pre < B.pre ? -1 : 1;
}

function send(channel, payload) {
  if (!win || win.isDestroyed()) return;
  try {
    win.webContents.send(channel, payload);
  } catch (_) { /* ignore */ }
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      redirect: 'follow',
      headers: {
        'User-Agent': 'ForestSurvivor-Updater',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error('GitHub HTTP ' + response.statusCode + ': ' + body.slice(0, 200)));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

/**
 * Download a URL to disk with progress (follows redirects).
 */
function downloadToFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const tmp = destPath + '.part';
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { /* ignore */ }

    const request = net.request({
      method: 'GET',
      url,
      redirect: 'follow',
      headers: { 'User-Agent': 'ForestSurvivor-Updater' },
    });

    request.on('response', (response) => {
      const status = response.statusCode | 0;
      if (status < 200 || status >= 300) {
        reject(new Error('Download HTTP ' + status));
        response.resume();
        return;
      }
      const total = parseInt(response.headers['content-length'] || '0', 10) || 0;
      let transferred = 0;
      const file = fs.createWriteStream(tmp);
      response.on('data', (chunk) => {
        transferred += chunk.length;
        if (typeof onProgress === 'function') {
          onProgress({
            percent: total ? (transferred / total) * 100 : 0,
            transferred,
            total,
          });
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          try {
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            fs.renameSync(tmp, destPath);
            resolve(destPath);
          } catch (err) {
            reject(err);
          }
        });
      });
      file.on('error', (err) => {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        reject(err);
      });
      response.on('error', (err) => {
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        reject(err);
      });
    });
    request.on('error', reject);
    request.end();
  });
}

function loadAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = true;
    // Local / CI builds are unsigned — signature checks would always fail.
    autoUpdater.verifyUpdateCodeSignature = false;

    autoUpdater.on('download-progress', (p) => {
      send('update:progress', {
        percent: p.percent || 0,
        transferred: p.transferred || 0,
        total: p.total || 0,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      downloading = false;
      useManualInstall = false;
      send('update:ready', {
        version: info && info.version ? info.version : (pendingInfo && pendingInfo.version),
      });
    });

    autoUpdater.on('error', (err) => {
      // Don't surface mid-download if we are about to fall back to direct download.
      console.warn('[updater] electron-updater error:', err && err.message);
    });
  } catch (err) {
    console.warn('[updater] electron-updater unavailable:', err && err.message);
    autoUpdater = null;
  }
  return autoUpdater;
}

async function fetchLatestRelease() {
  const list = await httpGetJson(RELEASES_API);
  if (!Array.isArray(list) || !list.length) {
    throw new Error('No GitHub releases found');
  }
  const data = list.find((r) => r && !r.draft) || null;
  if (!data) throw new Error('No published GitHub releases found');
  const tag = normalizeVersion(data.tag_name || data.name || '');
  if (!tag) throw new Error('Latest release has no tag');
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const setup = assets.find((a) =>
    /ForestSurvivor-Setup/i.test(a.name) || (/setup.*\.exe$/i.test(a.name) && !/portable/i.test(a.name))
  );
  const portable = assets.find((a) =>
    /ForestSurvivor-Portable/i.test(a.name) || /portable.*\.exe$/i.test(a.name)
  );
  const blockmap = assets.find((a) => /\.blockmap$/i.test(a.name));
  const latestYml = assets.find((a) => /^latest\.yml$/i.test(a.name));
  return {
    version: tag,
    name: data.name || tag,
    body: data.body || '',
    htmlUrl: data.html_url || RELEASES_PAGE,
    setupUrl: setup && setup.browser_download_url,
    setupName: setup && setup.name,
    portableUrl: portable && portable.browser_download_url,
    portableName: portable && portable.name,
    hasUpdateFeed: !!latestYml,
    publishedAt: data.published_at || null,
  };
}

function packageDownloadUrl() {
  if (!pendingInfo) return null;
  if (isPortable()) {
    return pendingInfo.portableUrl || pendingInfo.setupUrl || null;
  }
  return pendingInfo.setupUrl || pendingInfo.portableUrl || null;
}

function packageFileName() {
  if (!pendingInfo) return 'ForestSurvivor-Update.exe';
  if (isPortable()) {
    return pendingInfo.portableName || ('ForestSurvivor-Portable-' + pendingInfo.version + '.exe');
  }
  return pendingInfo.setupName || ('ForestSurvivor-Setup-' + pendingInfo.version + '.exe');
}

async function downloadDirectAsset() {
  const url = packageDownloadUrl();
  if (!url) throw new Error('No installer asset on the latest GitHub release');

  const dest = path.join(app.getPath('temp'), 'forest-survivor-update', packageFileName());
  downloading = true;
  useManualInstall = true;
  send('update:status', { state: 'downloading', version: pendingInfo.version, mode: 'direct' });

  await downloadToFile(url, dest, (p) => send('update:progress', p));
  manualPackagePath = dest;
  downloading = false;
  send('update:ready', { version: pendingInfo.version, mode: 'direct' });
  return { ok: true, path: dest };
}

/**
 * Check GitHub latest release tag vs local version.
 */
async function checkForUpdates(browserWindow) {
  win = browserWindow;
  if (!app.isPackaged) {
    send('update:status', { state: 'dev', currentVersion: app.getVersion() });
    return { ok: true, skipped: 'dev' };
  }

  const currentVersion = normalizeVersion(app.getVersion());
  send('update:status', { state: 'checking', currentVersion });

  let release;
  try {
    release = await fetchLatestRelease();
  } catch (err) {
    send('update:status', {
      state: 'error',
      currentVersion,
      message: String(err && err.message || err),
    });
    return { ok: false, error: String(err && err.message || err) };
  }

  const cmp = compareVersions(currentVersion, release.version);
  if (cmp >= 0) {
    send('update:status', {
      state: 'upToDate',
      currentVersion,
      latestVersion: release.version,
    });
    return { ok: true, upToDate: true, latestVersion: release.version };
  }

  pendingInfo = {
    currentVersion,
    version: release.version,
    name: release.name,
    notes: release.body,
    htmlUrl: release.htmlUrl,
    setupUrl: release.setupUrl,
    setupName: release.setupName,
    portableUrl: release.portableUrl,
    portableName: release.portableName,
    hasUpdateFeed: release.hasUpdateFeed,
    portable: isPortable(),
    canAutoInstall: !!(release.setupUrl || release.portableUrl),
  };

  send('update:available', pendingInfo);

  // Warm electron-updater when a feed exists (installed NSIS builds).
  const updater = loadAutoUpdater();
  if (updater && !isPortable() && release.hasUpdateFeed) {
    try {
      await updater.checkForUpdates();
    } catch (err) {
      console.warn('[updater] feed check failed (direct download still available):', err && err.message);
    }
  }

  return { ok: true, updateAvailable: true, info: pendingInfo };
}

async function startDownload() {
  if (!pendingInfo) return { ok: false, error: 'No update pending' };
  if (downloading) return { ok: true, downloading: true };
  if (!pendingInfo.canAutoInstall) {
    send('update:error', { message: 'Latest release has no downloadable Windows build attached.' });
    return { ok: false, error: 'No assets' };
  }

  // Portable always uses direct asset download (electron-updater can't replace portable).
  if (isPortable()) {
    try {
      return await downloadDirectAsset();
    } catch (err) {
      downloading = false;
      send('update:error', { message: String(err && err.message || err) });
      return { ok: false, error: String(err && err.message || err) };
    }
  }

  // Installed build: try electron-updater first when latest.yml is present.
  const updater = loadAutoUpdater();
  if (updater && pendingInfo.hasUpdateFeed) {
    downloading = true;
    useManualInstall = false;
    send('update:status', { state: 'downloading', version: pendingInfo.version, mode: 'updater' });
    try {
      const result = await updater.checkForUpdates();
      if (!result || !result.updateInfo) throw new Error('No update info from feed');
      await updater.downloadUpdate();
      return { ok: true, downloading: true, mode: 'updater' };
    } catch (err) {
      console.warn('[updater] feed download failed, falling back to direct:', err && err.message);
      downloading = false;
    }
  }

  // Direct GitHub asset download (works without latest.yml).
  try {
    return await downloadDirectAsset();
  } catch (err) {
    downloading = false;
    send('update:error', { message: String(err && err.message || err) });
    return { ok: false, error: String(err && err.message || err) };
  }
}

function installPortable(packagePath) {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const currentExe = app.getPath('exe');
  const targetName = path.basename(currentExe);
  const targetPath = path.join(portableDir || path.dirname(currentExe), targetName);
  const bat = path.join(app.getPath('temp'), 'forest-survivor-portable-update.bat');
  const lines = [
    '@echo off',
    'setlocal',
    'timeout /t 2 /nobreak >nul',
    'copy /y "' + packagePath + '" "' + targetPath + '"',
    'start "" "' + targetPath + '"',
    'del "' + packagePath + '" >nul 2>&1',
    'del "%~f0"',
  ];
  fs.writeFileSync(bat, lines.join('\r\n'), 'utf8');
  spawn(bat, [], { detached: true, stdio: 'ignore', shell: true, windowsHide: true }).unref();
  app.quit();
  return { ok: true };
}

function installNsis(packagePath) {
  // Launch the downloaded Setup.exe then quit so files unlock.
  spawn(packagePath, ['--updated'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  }).unref();
  setTimeout(() => app.quit(), 400);
  return { ok: true };
}

function quitAndInstall() {
  if (useManualInstall && manualPackagePath && fs.existsSync(manualPackagePath)) {
    if (isPortable()) return installPortable(manualPackagePath);
    return installNsis(manualPackagePath);
  }

  const updater = loadAutoUpdater();
  if (updater) {
    updater.quitAndInstall(false, true);
    return { ok: true };
  }

  // Last resort: if we somehow have a package path, run it.
  if (manualPackagePath && fs.existsSync(manualPackagePath)) {
    return isPortable() ? installPortable(manualPackagePath) : installNsis(manualPackagePath);
  }
  return { ok: false, error: 'No downloaded update to install' };
}

function getPending() {
  return pendingInfo;
}

module.exports = {
  checkForUpdates,
  startDownload,
  quitAndInstall,
  getPending,
  compareVersions,
  normalizeVersion,
  GITHUB_OWNER,
  GITHUB_REPO,
};
