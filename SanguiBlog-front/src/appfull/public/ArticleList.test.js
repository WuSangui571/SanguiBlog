import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ArticleList.jsx'), 'utf8');

assert.match(source, /className="flex w-\[72px\] shrink-0 justify-end"/);
assert.match(source, /opacity-0 pointer-events-none/);
assert.doesNotMatch(source, /\{keyword && \(/);

console.log('ArticleList tests passed');
