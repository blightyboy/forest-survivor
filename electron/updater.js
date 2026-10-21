'use strict';

/**
 * GitHub release-based updates.
 * 1) Compare local app version to the latest GitHub release tag.
 * 2) If newer, prompt the renderer; on accept download via electron-updater
 *    (NSIS / installed builds) or open the release page (portable / fallback).
 */

const { app, shell, net } = require('electron');
const path = require('path');

const GITHUB_OWNER = 'blightyboy';
const GITHUB_REPO = 'forest-survivor';
// List endpoint (not /latest) so prerelease / alpha tags still count.
const RELEASES_API =
  'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases?per_page=10';
const RELEASES_PAGE =
  'https://github.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/releases/latest';

/** @type {import('electron').BrowserWindow | null} */
let win = null;
let autoUpdater = null;
let pendingInfo = null;
let downloading = false;

function isPortable() {
  return !!process.env.PORTABLE_EXECUTABLE_DIR;
}

/** Strip leading v and normalize for compare. */
function normalizeVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^v/i, '')
    .replace(/^V/, '');
}

/**
 * Semver-ish compare: major.minor.patch[-prerelease]
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
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
  // No prerelease > prerelease (1.0.0 > 1.0.0-alpha)
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

function loadAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = true;

    autoUpdater.on('download-progress', (p) => {
      send('update:progress', {
        percent: p.percent || 0,
        transferred: p.transferred || 0,
        total: p.total || 0,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      downloading = false;
      send('update:ready', {
        version: info && info.version ? info.version : (pendingInfo && pendingInfo.version),
      });
    });

    autoUpdater.on('error', (err) => {
      downloading = false;
      send('update:error', { message: String(err && err.message || err) });
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
  // Prefer newest published release (prereleases allowed; drafts skipped).
  const data = list.find((r) => r && !r.draft) || null;
  if (!data) throw new Error('No published GitHub releases found');
  const tag = normalizeVersion(data.tag_name || data.name || '');
  if (!tag) throw new Error('Latest release has no tag');
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const setup = assets.find((a) => /setup.*\.exe$/i.test(a.name) || /ForestSurvivor-Setup/i.test(a.name));
  const portable = assets.find((a) => /portable.*\.exe$/i.test(a.name) || /ForestSurvivor-Portable/i.test(a.name));
  return {
    version: tag,
    name: data.name || tag,
    body: data.body || '',
    htmlUrl: data.html_url || RELEASES_PAGE,
    setupUrl: setup && setup.browser_download_url,
    portableUrl: portable && portable.browser_download_url,
    publishedAt: data.published_at || null,
  };
}

/**
 * Check GitHub latest release tag vs local version.
 * Called after the window is ready.
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
    portableUrl: release.portableUrl,
    portable: isPortable(),
    canAutoInstall: !isPortable(),
  };

  send('update:available', pendingInfo);

  // Warm electron-updater feed in the background (needs latest.yml on the release).
  const updater = loadAutoUpdater();
  if (updater && !isPortable()) {
    try {
      await updater.checkForUpdates();
    } catch (err) {
      console.warn('[updater] feed check failed (tag compare still valid):', err && err.message);
    }
  }

  return { ok: true, updateAvailable: true, info: pendingInfo };
}

async function startDownload() {
  if (!pendingInfo) return { ok: false, error: 'No update pending' };
  if (downloading) return { ok: true, downloading: true };

  // Portable / missing installer assets: open the release page.
  if (pendingInfo.portable || !pendingInfo.canAutoInstall) {
    const url = pendingInfo.setupUrl || pendingInfo.portableUrl || pendingInfo.htmlUrl || RELEASES_PAGE;
    await shell.openExternal(url);
    send('update:status', { state: 'openedBrowser', version: pendingInfo.version, url });
    return { ok: true, openedBrowser: true, url };
  }

  const updater = loadAutoUpdater();
  if (!updater) {
    const url = pendingInfo.setupUrl || pendingInfo.htmlUrl || RELEASES_PAGE;
    await shell.openExternal(url);
    return { ok: true, openedBrowser: true, url };
  }

  downloading = true;
  send('update:status', { state: 'downloading', version: pendingInfo.version });
  try {
    // Re-check so updater knows the target, then download.
    await updater.checkForUpdates();
    await updater.downloadUpdate();
    return { ok: true, downloading: true };
  } catch (err) {
    downloading = false;
    // Fallback: open release if feed/assets missing.
    const url = pendingInfo.setupUrl || pendingInfo.htmlUrl || RELEASES_PAGE;
    send('update:error', {
      message: String(err && err.message || err),
      fallbackUrl: url,
    });
    try { await shell.openExternal(url); } catch (_) { /* ignore */ }
    return { ok: false, error: String(err && err.message || err), openedBrowser: true, url };
  }
}

function quitAndInstall() {
  const updater = loadAutoUpdater();
  if (updater) {
    // isSilent=false, isForceRunAfter=true
    updater.quitAndInstall(false, true);
    return { ok: true };
  }
  return { ok: false, error: 'Updater not available' };
}

function openReleasePage() {
  const url = (pendingInfo && pendingInfo.htmlUrl) || RELEASES_PAGE;
  shell.openExternal(url);
  return { ok: true, url };
}

function getPending() {
  return pendingInfo;
}

module.exports = {
  checkForUpdates,
  startDownload,
  quitAndInstall,
  openReleasePage,
  getPending,
  compareVersions,
  normalizeVersion,
  GITHUB_OWNER,
  GITHUB_REPO,
};
