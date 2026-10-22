import fs from 'fs';

let s = fs.readFileSync('legacy/js/music.js', 'utf8');
s = s.replace(/^'use strict';\s*/, '');
const hookIdx = s.indexOf('// Hook mute');
if (hookIdx >= 0) s = s.slice(0, hookIdx);
s = s.replace(/const Music = \{/, 'export const Music = {');
s = s.replace(/Sound\.ctx/g, 'Audio.getContext()');
s = s.replace(/Sound\.muted/g, 'Audio.muted');

const header = `/**
 * Looping medieval tavern themes (Web Audio sequencer).
 * Port of legacy/js/music.js — priority: boss > miniboss > game; menu bed off-run.
 */
import { Audio } from './Audio';

`;

fs.writeFileSync('src/audio/Music.ts', header + s);
console.log('wrote src/audio/Music.ts', fs.statSync('src/audio/Music.ts').size);
