'use strict';

/** Run electron-builder with code-signing auto-discovery disabled. */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const args = process.argv.slice(2);
const cliJs = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'cli.js');
const electronBuilderPkg = path.join(__dirname, '..', 'node_modules', 'electron-builder', 'package.json');

let entry = cliJs;
if (!fs.existsSync(entry)) {
  // Fallback: resolve package bin
  const pkg = JSON.parse(fs.readFileSync(electronBuilderPkg, 'utf8'));
  const binRel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['electron-builder'];
  entry = path.join(__dirname, '..', 'node_modules', 'electron-builder', binRel);
}

const result = spawnSync(process.execPath, [entry, ...args], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status == null ? 1 : result.status);
