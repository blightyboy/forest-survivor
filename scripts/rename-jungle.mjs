/**
 * Rename jungle* APIs / strings → forest* (product is Forest Survivor).
 * Keeps reading old save keys where noted in Meta/Settings separately.
 */
import fs from 'fs';
import path from 'path';

const roots = ['src', 'electron', 'readme.md', 'package.json'];
const exts = new Set(['.ts', '.js', '.d.ts', '.md', '.json', '.css', '.html']);

const pairs = [
  ['Close Jungle Survival', 'Close Forest Survivor'],
  ['jungleSurvival_meta_v1', 'forestSurvivor_meta_v1'],
  ['__jungleApplyVsync', '__forestApplyVsync'],
  ['__jungleApplyZoom', '__forestApplyZoom'],
  ['jungleSave', 'forestSave'],
  ['jungleDisplay', 'forestDisplay'],
  ['jungleUpdate', 'forestUpdate'],
  ['JUNGLE_VITE', 'FOREST_VITE'],
  ['JUNGLE_DEVTOOLS', 'FOREST_DEVTOOLS'],
  ['jungle greens', 'forest greens'],
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'dist-web' || ent.name === 'legacy') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(ent.name)) || ent.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const files = [];
for (const r of roots) {
  const p = path.resolve(r);
  if (!fs.existsSync(p)) continue;
  if (fs.statSync(p).isDirectory()) walk(p, files);
  else files.push(p);
}

let changed = 0;
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let next = text;
  for (const [a, b] of pairs) next = next.split(a).join(b);
  if (next !== text) {
    fs.writeFileSync(file, next);
    changed++;
    console.log('updated', path.relative(process.cwd(), file));
  }
}
console.log('files changed:', changed);
