import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'Hero.jsx'), 'utf8');

assert.match(source, /prefers-reduced-motion: reduce/);
assert.match(source, /pointer: coarse/);
assert.match(source, /useTransform\(scrollY, \[0, 220\], \[0, -96\]\)/);
assert.match(source, /scale\(1\.02\) translate/);

console.log('Hero performance tests passed');
