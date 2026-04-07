import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'Navigation.jsx'), 'utf8');

assert.match(source, /第 \{page\} 页/);
assert.doesNotMatch(source, /绗\?\{page\} 椤\?/);
assert.match(source, /colorScheme: isDarkMode \? 'dark' : 'light'/);

console.log('Navigation notification select tests passed');
