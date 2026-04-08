import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, '..', 'AppFull.jsx'), 'utf8');

assert.match(source, /localStorage\.getItem\('sg_background_enabled'\)/);
assert.match(source, /if \(stored === null\) return false;/);
assert.match(source, /return stored !== 'false';/);

console.log('background enabled default tests passed');
