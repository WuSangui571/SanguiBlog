import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'TiltCard.jsx'), 'utf8');

assert.doesNotMatch(source, /useMotionValue/);
assert.doesNotMatch(source, /useTransform/);
assert.doesNotMatch(source, /rotateX/);
assert.doesNotMatch(source, /rotateY/);
assert.doesNotMatch(source, /onMouseMove=\{handleMouse\}/);
assert.match(source, /whileHover=\{\{ y: -2 \}\}/);

console.log('TiltCard performance tests passed');
