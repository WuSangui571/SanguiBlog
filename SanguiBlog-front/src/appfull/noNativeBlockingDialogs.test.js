import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const aiAssistantWidgetSource = fs.readFileSync(path.join(__dirname, 'ui', 'AiAssistantWidget.jsx'), 'utf8');

assert.doesNotMatch(adminPanelSource, /window\.confirm\s*\(/);
assert.doesNotMatch(adminPanelSource, /window\.alert\s*\(/);
assert.doesNotMatch(aiAssistantWidgetSource, /window\.confirm\s*\(/);
assert.doesNotMatch(aiAssistantWidgetSource, /window\.alert\s*\(/);

console.log('noNativeBlockingDialogs tests passed');
