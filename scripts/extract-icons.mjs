import fs from 'fs';

const s = fs.readFileSync('legacy/js/ui.js', 'utf8').replace(/\r\n/g, '\n');
const start = s.indexOf('const ICONS = {');
const end = s.indexOf('\n};\n\nconst RES_ORDER', start);
if (start < 0 || end < 0) {
  console.error('ICONS block not found', start, end);
  process.exit(1);
}
let body = s.slice(start + 'const ICONS = '.length, end + 2);
// Drop the first duplicate `armor` key (gear vs passive); keep the last definition.
body = body.replace(
  /\n  armor: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3\.5 8\.5-8 10-4\.5-1\.5-8-5-8-10V6z" fill="#c8312b" stroke="#2a1b12" stroke-width="1\.5"\/><\/svg>',/,
  '',
);
const out =
  `/** Legacy UI SVG icons (from legacy/js/ui.js). */\n` +
  `export const ICONS: Record<string, string> = ${body};\n\n` +
  `export function icon(id: string | undefined | null, fallback = ''): string {\n` +
  `  if (!id) return fallback ? ICONS[fallback] || '' : '';\n` +
  `  return ICONS[id] || (fallback ? ICONS[fallback] || '' : '');\n` +
  `}\n`;
fs.mkdirSync('src/ui', { recursive: true });
fs.writeFileSync('src/ui/icons.ts', out);
const keys = [...body.matchAll(/\n  (\w+):/g)].map((m) => m[1]);
console.log('wrote src/ui/icons.ts', keys.length, 'keys');
