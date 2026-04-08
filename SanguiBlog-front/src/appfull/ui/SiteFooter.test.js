import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'SiteFooter.jsx'), 'utf8');

assert.match(source, /border-t/);
assert.match(source, /max-w-5xl/);
assert.match(source, /tracking-\[0\.28em\]/);
assert.match(source, /End Of Page/);
assert.match(source, /brand = 'SANGUI BLOG'/);
assert.match(source, /copyrightText/);
assert.match(source, /icpNumber/);
assert.match(source, /poweredBy/);
assert.doesNotMatch(source, /home-ios-card--static/);
assert.doesNotMatch(source, /Site Footer/);
assert.doesNotMatch(source, /border-t-8/);

console.log('SiteFooter tests passed');
