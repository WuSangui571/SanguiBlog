import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'SiteFooter.jsx'), 'utf8');

assert.match(source, /home-ios-card/);
assert.match(source, /home-ios-card--static/);
assert.match(source, /brand = 'SANGUI BLOG'/);
assert.match(source, /copyrightText/);
assert.match(source, /icpNumber/);
assert.match(source, /poweredBy/);
assert.match(source, /Site Footer/);
assert.doesNotMatch(source, /border-t-8/);
assert.doesNotMatch(source, /bg-black text-white border-\[#FFD700\]/);

console.log('SiteFooter tests passed');
