import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(widgetSource, /Beta 测试版/);
assert.doesNotMatch(widgetSource, /Beta娴嬭瘯/);

console.log('AiAssistantWidget tests passed');
