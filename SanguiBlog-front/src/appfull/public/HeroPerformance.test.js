import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'Hero.jsx'), 'utf8');

assert.match(source, /prefers-reduced-motion: reduce/);
assert.match(source, /pointer: coarse/);
assert.match(source, /useTransform\(scrollY, \[0, 180, 520\], \[1, 0\.9, 0\]\)/);
assert.doesNotMatch(source, /useTransform\(scrollY, \[0, 80, 220\], \[1, 0\.72, 0\]\)/);
assert.doesNotMatch(source, /const contentY = useTransform/);
assert.match(source, /style=\{\{ opacity: contentOpacity \}\}/);
assert.match(source, /scale\(1\.02\) translate/);

console.log('Hero performance tests passed');
