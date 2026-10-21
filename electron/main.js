'use strict';

const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const updater = require('./updater');

const SAVE_NAME = 'save.json';

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** Last non-fullscreen windowed size for restore. */
let windowedBounds = { width: 1280, height: 720 };

/**
 * Canonical save location: Electron userData.
 * Survives `npm run build` wiping dist/win-unpacked (where the exe-adjacent
 * save used to live).
 */
function primarySavePath() {
  return path.join(app.getPath('userData'), SAVE_NAME);
}

/** Older locations we may still find a save in and should migrate from. */
function legacySavePaths() {
  const paths = [
    path.join(__dirname, '..', SAVE_NAME), // project root (dev / old)
  ];
  if (app.isPackaged) {
    paths.push(path.join(path.dirname(app.getPath('exe')), SAVE_NAME));
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if (portableDir) paths.push(path.join(portableDir, SAVE_NAME));
  }
  return paths;
}

function readJsonFile(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data && typeof data === 'object' ? data : null;
  } catch (_) {
    return null;
  }
}

function readSaveFile() {
  const primary = primarySavePath();
  const fromPrimary = readJsonFile(primary);
  if (fromPrimary) return fromPrimary;

  // Migrate progress out of dist/ / next-to-exe so rebuilds cannot erase it.
  for (const file of legacySavePaths()) {
    if (path.resolve(file) === path.resolve(primary)) continue;
    const data = readJsonFile(file);
    if (!data) continue;
    writeSaveFile(data);
    return data;
  }
  return null;
}

function writeSaveFile(data) {
  const payload = JSON.stringify(data, null, 2);
  const primary = primarySavePath();
  try {
    fs.mkdirSync(path.dirname(primary), { recursive: true });
    fs.writeFileSync(primary, payload, 'utf8');
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }

  // Mirror next to a portable exe when possible (USB-friendly), without
  // making that the only copy — dist rebuilds must not be the sole home.
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    try {
      fs.writeFileSync(path.join(portableDir, SAVE_NAME), payload, 'utf8');
    } catch (_) { /* ignore mirror failures */ }
  }

  return { ok: true, path: primary };
}

function listResolutions() {
  const display = screen.getPrimaryDisplay();
  const maxW = display.bounds.width;
  const maxH = display.bounds.height;
  const presets = [
    [1280, 720], [1366, 768], [1600, 900], [1920, 1080],
    [2560, 1440], [3840, 2160],
  ];
  const out = [];
  const seen = new Set();
  const push = (w, h, label) => {
    const key = w + 'x' + h;
    if (seen.has(key) || w > maxW || h > maxH) return;
    seen.add(key);
    out.push({ width: w, height: h, label: label || (w + ' × ' + h) });
  };
  for (const [w, h] of presets) push(w, h);
  push(maxW, maxH, maxW + ' × ' + maxH + ' (Native)');
  if (!out.length) push(Math.min(1280, maxW), Math.min(720, maxH));
  return { resolutions: out, native: { width: maxW, height: maxH } };
}

function getDisplayState() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) {
    return { mode: 'windowed', width: 1280, height: 720, available: false };
  }
  let mode = 'windowed';
  if (win.isFullScreen()) mode = 'fullscreen';
  else {
    const b = win.getBounds();
    const d = screen.getDisplayMatching(b).bounds;
    if (b.x <= d.x + 2 && b.y <= d.y + 2 && b.width >= d.width - 4 && b.height >= d.height - 4) {
      mode = 'borderless';
    }
  }
  const size = win.getSize();
  return {
    mode,
    width: size[0],
    height: size[1],
    available: true,
  };
}

function applyDisplaySettings(settings) {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return { ok: false };
  const mode = settings && settings.mode ? settings.mode : 'windowed';
  const width = Math.max(900, (settings && settings.width) | 0 || 1280);
  const height = Math.max(560, (settings && settings.height) | 0 || 720);
  const display = screen.getPrimaryDisplay();

  if (mode === 'fullscreen') {
    if (!win.isFullScreen()) {
      const b = win.getBounds();
      windowedBounds = { width: b.width, height: b.height };
    }
    win.setResizable(true);
    win.setFullScreen(true);
    return { ok: true, ...getDisplayState() };
  }

  if (win.isFullScreen()) win.setFullScreen(false);

  if (mode === 'borderless') {
    const b = display.bounds;
    win.setResizable(false);
    win.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
    return { ok: true, ...getDisplayState() };
  }

  // Windowed
  win.setResizable(true);
  const maxW = display.workAreaSize.width;
  const maxH = display.workAreaSize.height;
  const w = Math.min(width, maxW);
  const h = Math.min(height, maxH);
  windowedBounds = { width: w, height: h };
  win.setSize(w, h);
  win.center();
  return { ok: true, ...getDisplayState() };
}

function appIconPath() {
  return path.join(__dirname, '..', 'icon.png');
}

function createWindow() {
  const win = new BrowserWindow({
    width: windowedBounds.width,
    height: windowedBounds.height,
    minWidth: 900,
    minHeight: 560,
    title: 'Forest Survivor',
    icon: appIconPath(),
    backgroundColor: '#1b3014',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow = win;
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  win.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      updater.checkForUpdates(mainWindow).catch((err) => {
        console.warn('[updater] check failed:', err && err.message);
      });
    }, 1200);
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  if (!app.isPackaged && process.env.JUNGLE_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  ipcMain.on('save:load', (event) => {
    event.returnValue = readSaveFile();
  });

  ipcMain.on('save:write', (event, data) => {
    event.returnValue = writeSaveFile(data && typeof data === 'object' ? data : {});
  });

  ipcMain.on('save:path', (event) => {
    event.returnValue = primarySavePath();
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.on('display:list', (event) => {
    event.returnValue = listResolutions();
  });

  ipcMain.on('display:get', (event) => {
    event.returnValue = getDisplayState();
  });

  ipcMain.on('display:apply', (event, settings) => {
    event.returnValue = applyDisplaySettings(settings || {});
  });

  ipcMain.handle('update:check', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: 'No window' };
    }
    return updater.checkForUpdates(mainWindow);
  });
  ipcMain.handle('update:download', async () => updater.startDownload());
  ipcMain.handle('update:install', async () => updater.quitAndInstall());
  ipcMain.handle('update:openRelease', async () => updater.openReleasePage());
  ipcMain.handle('update:pending', async () => updater.getPending());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
