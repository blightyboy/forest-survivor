'use strict';

/**
 * Back up / restore save.json around electron-builder runs.
 * Builder wipes dist/, which used to hold the next-to-exe save.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKUP = path.join(ROOT, '.save-backup.json');
const SAVE = 'save.json';

const CANDIDATES = [
  path.join(ROOT, SAVE),
  path.join(ROOT, 'dist', 'win-unpacked', SAVE),
  path.join(ROOT, 'dist', SAVE),
];

function appDataCandidates() {
  const base = process.env.APPDATA;
  if (!base) return [];
  return [
    path.join(base, 'forest-survivor', SAVE),
    path.join(base, 'Forest Survivor', SAVE),
  ];
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const mode = process.argv[2];

if (mode === 'backup') {
  const sources = CANDIDATES.concat(appDataCandidates());
  for (const file of sources) {
    if (!fs.existsSync(file)) continue;
    copyFile(file, BACKUP);
    console.log('[preserve-save] backed up', file);
    process.exit(0);
  }
  if (fs.existsSync(BACKUP)) {
    console.log('[preserve-save] keeping existing backup');
  } else {
    console.log('[preserve-save] no save found to back up');
  }
  process.exit(0);
}

if (mode === 'restore') {
  if (!fs.existsSync(BACKUP)) {
    console.log('[preserve-save] no backup to restore');
    process.exit(0);
  }

  const restored = [];
  // Prefer AppData (canonical location used by the app).
  for (const dest of appDataCandidates()) {
    copyFile(BACKUP, dest);
    restored.push(dest);
  }
  // Keep a project-root copy for `npm start` / migration.
  copyFile(BACKUP, path.join(ROOT, SAVE));
  restored.push(path.join(ROOT, SAVE));

  const unpacked = path.join(ROOT, 'dist', 'win-unpacked');
  if (fs.existsSync(unpacked)) {
    const dest = path.join(unpacked, SAVE);
    copyFile(BACKUP, dest);
    restored.push(dest);
  }

  console.log('[preserve-save] restored to:\n  ' + restored.join('\n  '));
  process.exit(0);
}

console.error('Usage: node electron/preserve-save.js [backup|restore]');
process.exit(1);
