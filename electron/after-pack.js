'use strict';

/**
 * Stamp the Windows .exe icon/metadata after pack.
 * win.signAndEditExecutable is false so electron-builder never downloads
 * winCodeSign (7z extract needs symlink privileges on Windows).
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

function findRceditBin() {
  const base = path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin');
  const x64 = path.join(base, 'rcedit-x64.exe');
  const x86 = path.join(base, 'rcedit.exe');
  if (fs.existsSync(x64)) return x64;
  if (fs.existsSync(x86)) return x86;
  return null;
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exeName = context.packager.appInfo.productFilename + '.exe';
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  const rceditBin = findRceditBin();

  if (!fs.existsSync(exePath)) {
    console.warn('[after-pack] exe not found:', exePath);
    return;
  }
  if (!rceditBin) {
    console.warn('[after-pack] rcedit binary missing; skip icon stamp');
    return;
  }
  if (!fs.existsSync(iconPath)) {
    console.warn('[after-pack] icon missing, skip rcedit:', iconPath);
    return;
  }

  const version = context.packager.appInfo.version;
  const args = [
    exePath,
    '--set-icon', iconPath,
    '--set-version-string', 'CompanyName', 'Forest Survivor',
    '--set-version-string', 'FileDescription', 'Forest Survivor',
    '--set-version-string', 'ProductName', 'Forest Survivor',
    '--set-version-string', 'OriginalFilename', exeName,
    '--set-file-version', version,
    '--set-product-version', version,
  ];

  execFileSync(rceditBin, args, { stdio: 'inherit' });
  console.log('[after-pack] stamped icon + version on', exeName);
};
