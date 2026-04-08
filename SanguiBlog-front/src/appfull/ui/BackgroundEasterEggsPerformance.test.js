import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'BackgroundEasterEggs.jsx'), 'utf8');

assert.match(source, /prefers-reduced-motion: reduce/);
assert.match(source, /const starCount = fixed \? 40 : 24/);

console.log('BackgroundEasterEggs performance tests passed');
