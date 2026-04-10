import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'Navigation.jsx'), 'utf8');

assert.match(source, /font-black text-sm">彩蛋背景</);
assert.match(source, /aria-label="切换彩蛋背景"/);
assert.doesNotMatch(source, /关闭彩蛋背景/);
assert.doesNotMatch(source, /开启彩蛋背景/);

console.log('Navigation mobile background toggle tests passed');
