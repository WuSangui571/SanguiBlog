import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'ArchiveView.jsx'), 'utf8');

assert.match(source, /archiveActionButtonClass/);
assert.match(source, /rounded-full/);
assert.match(source, /返回首页/);
assert.match(source, /刷新归档/);
assert.doesNotMatch(source, /archiveActionWrapClass/);
assert.doesNotMatch(source, /shadow-\[6px_6px_0px_0px_#000\]/);

console.log('ArchiveView tests passed');
