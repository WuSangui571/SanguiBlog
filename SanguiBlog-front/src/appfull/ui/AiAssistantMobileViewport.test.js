import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(widgetSource, /window\.visualViewport/);
assert.match(widgetSource, /const \[mobileViewportRect, setMobileViewportRect\] = useState/);
assert.match(widgetSource, /const handleTextareaFocus = useCallback/);
assert.match(widgetSource, /onFocus=\{handleTextareaFocus\}/);
assert.doesNotMatch(widgetSource, /height:\s*'100vh'/);

console.log('AiAssistant mobile viewport tests passed');
