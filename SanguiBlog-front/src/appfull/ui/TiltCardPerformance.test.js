import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'TiltCard.jsx'), 'utf8');

assert.match(source, /const tiltRange = 3\.5/);
assert.match(source, /const motionEffectsEnabled = isNew && !disableEffects/);
assert.match(source, /whileHover=\{\{ y: -3, rotate: -0\.4 \}\}/);

console.log('TiltCard performance tests passed');
