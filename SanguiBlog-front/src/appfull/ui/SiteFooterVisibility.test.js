import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'SiteFooter.jsx'), 'utf8');

assert.match(source, /const resolvedIcpLink =/);
assert.match(source, /href=\{resolvedIcpLink\}/);
assert.match(source, /pointer-events-auto/);
assert.doesNotMatch(source, /<h2[\s\S]*\{brand\}[\s\S]*<\/h2>/);
assert.doesNotMatch(source, /<p[\s\S]*\{poweredBy\}[\s\S]*<\/p>/);

console.log('SiteFooter visibility tests passed');
